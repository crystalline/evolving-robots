
var fs = require('fs');
var cluster = require('cluster');
var parallel = require('./parallel.js');
var util = require('./util.js');
var Tensor = require('./tensor.js').Tensor;
var ga = require('./ga.js');
var robotsim = require('./robotsim.js');
var controllers = require('./controllers.js');

var pr = console.log;

function L2square(x1,y1,x2,y2) {
    var dx = x1-x2;
    var dy = y1-y2;
    return dx*dx+dy*dy
}

function L2distance(x1,y1,x2,y2) {
    return Math.sqrt(L2square(x1,y1,x2,y2));
}

function approxNormal(mean, variance) {
    var sum = 0;
    sum += Math.random() - 0.5;
    sum += Math.random() - 0.5;
    sum += Math.random() - 0.5;
    sum += Math.random() - 0.5;
    return variance*(2*sum)+mean;
}

function initArray(arr, fn) {
    for (var i=0; i<arr.length; i++) { arr[i] = fn(i) }
}

function F64arrayTobuffer(arr) {
    if (arr instanceof Float64Array) {
        var ptr = 0;
        var b = new Buffer(4+arr.length*8);
        b.writeUInt32LE(arr.length, ptr);
        ptr += 4;
        for (var i=0; i<arr.length; i++) {
            b.writeDoubleLE(arr[i], ptr);
            ptr += 8;
        }
        return b;
    } else { pr('Error in f64arrayTobuffer') }
}

function bufferToF64array(buf, arr) {
    if (buf instanceof Buffer && (buf.length >= (buf.readUInt32LE(0)+4))) {
        var len = buf.readUInt32LE(0);
        var ret = arr || new Float64Array(len);
        if (ret.length !== len) { pr('Error in bufferTof64array in supplied arr length'); return }
        var ptr = 4;
        for (var i=0; i<len; i++) {
            ret[i] = buf.readDoubleLE(ptr);
            ptr += 8;
        }
        return ret;
    } else { pr('Error in bufferTof64array') }
}

function saveF64array(fpath, arr) {
    fs.writeFileSync(fpath, F64arrayTobuffer(arr));
}

function loadF64array(fpath, arr) {
    return bufferToF64array(fs.readFileSync(fpath, null), arr);
}

function testSaveLoadf64() {
    var arr = new Float64Array(10000);
    initArray(arr, x => Math.random());
    saveF64array('temp.f64.bin', arr);
    var loaded = loadF64array('temp.f64.bin');
    if (!compareArrays(arr, loaded)) { pr('TEST FAILED') }
    else { pr('TEST PASSED') }
}
//testSaveLoadf64();
//return;

var simSteps = 5000;
var simDT = 1/50;
var minSpeed = -4;
var maxSpeed = 4;
var maxDistance = maxSpeed*simSteps*simDT;

var controller = new controllers.RNN(9, 2, 10);
//var controller = new controllers.Perceptron(9, 2);
var genomeSize = controller.Nparams;

robotWorldFitness = function(individual) {
    
    var genome = individual.genome;
    //var prng = new util.prng(individual.prng.state);// || Math.random;
    
    var model = new robotsim.RobotWorldModel({random: Math.random});
    
    var speed = new Tensor([2], new Float64Array([0,0]));
    var vision = new Tensor([model.vision.length], model.vision);
    var distTraveled = 0;
    var collisionSteps = 0;
    var px = model.x, py = model.y;
    var i;
    
    var visitedSectors = {};
    
    controller.reset && controller.reset();
    controller.setParamsFromArray(genome);
        
    for (i=0; i<simSteps; i++) {
        model.step(speed.data, simDT);
        
        controller.compute(vision, speed);
        
        speed.data[0] = Math.min(maxSpeed, Math.max(minSpeed, speed.data[0]));
        speed.data[1] = Math.min(maxSpeed, Math.max(minSpeed, speed.data[1]));
        
        distTraveled += L2distance(model.x, model.y, px, py);
        px = model.x;
        py = model.y;
        
        visitedSectors[Math.floor(model.x)+Math.floor(model.y)*10] = true;
        
        if (model.onBall) { collisionSteps++; }
    }
    
    var travelArea = Object.keys(visitedSectors).length/100;
    //pr(travelArea);
    //var fitness = (-10*collisionSteps/simSteps) + distTraveled;// + (travelArea - 0.03);
    var fitness = (-10*collisionSteps/simSteps) + travelArea + distTraveled/maxDistance;
    
    return {f: fitness, s: individual.s};
}

var envName = 'avoid';

function evolve(onDone) {
        
    var outDir = 'out';
    var genomeSize = controller.Nparams;
    var _mutRate = 20/genomeSize;
    var _waitMutMin = 0;
    
    if (!fs.existsSync(outDir)) { fs.mkdirSync(outDir) }
    fs.writeFileSync(outDir+'/history.json', '');
    
    pr('Evolving Robot Controller');
    pr('Environment:',envName);
    pr('Controller:');
    controller.print();
    
    /*
    var mutateFn = ga.makeAdaptiveMutRate({
        threshold: 0.1,
        mutInit: 45/genomeSize,
        mutMax: 100/genomeSize,
        mutMin: 0.5/genomeSize,
        mutFactor: 1.05,
        mutRestartOnMin: true,
        mutRestartOnStagnation: 30,
    });
    */
    
    var prevBestFitness = -Infinity;
    
    var mutateFn = ga.makeExpAnnealingMutRate({
        initHigh: 25/genomeSize,
        initLow: 5/genomeSize,
        endHigh: 5/genomeSize,
        endLow: 0.5/genomeSize,
        smallPeriod: 20,
        largePeriod: 300,
    });
    
    var conf = {
        executeTasks: global.distExecuteTasks ? global.distExecuteTasks : false,
        popSize: 200,
        winners: 5,
        losers: 10,
        generations: 5000,
        preserveWinners: true,
        bestReseedAfter: 30,
        //prngClass: util.prng,
        initGenome: function (i, initParams, random) {
            var genome = new Float64Array(genomeSize);
            //initArray(genome, x => { if (Math.random < 1/8) { return approxNormal(0, 0.1) } else return 0 });
            initArray(genome, x => { return approxNormal(0, 0.5) });
            return genome;
        },
        opParams:   mutateFn,
        mutate: function(genome, opParams, random) {
            var mutRate = opParams.mutRate;
            for (var i=0; i<genome.length; i++) {
                if (random() < mutRate) genome[i] = approxNormal(0, 0.5);
            }
        },
        recombine:  function (genomeA, genomeB, genomeChild, opParams, random) {
            if (random() < 0.5) {
                for (var i=0; i<genomeA.length; i++) {
                    var weight = random();
                    genomeChild[i] = weight*genomeA[i] + (1-weight)*genomeB[i];
                }
            } else {
                for (var i=0; i<genomeA.length; i++) {
                    genomeChild[i] = (random() < 0.5) ? genomeA[i] : genomeB[i];
                }
            }
        },
        onGenDone: function (gen, bestGenome, bestFit, parentFit, minFit, avgFit, maxFit, opParams, population) {
            if (bestFit > prevBestFitness) {
                prevBestFitness = bestFit;
                saveF64array(outDir+'/bestgenome_'+gen+'.f64.bin', bestGenome);
            }
            fs.appendFileSync(outDir+'/history.json',
                JSON.stringify({bf:bestFit, af:avgFit, minf: minFit, maxf:maxFit, mRate:opParams.mutRate})+'\n'
            );
        },
        fitnessFnName: 'robotWorldFitness',
        silent: false,
        onDone: function (bg, bf) {
            pr('DONE');
            if (onDone) onDone(bg, bf);
            else process.exit();
        }
    };
    
    if (true) {
         pr('GA started');
         ga.runSimpleGA(conf);
    }
}

var input = process.argv;
isServer = true;

if (input[2] === 'cluster') {
    var nworkers = input[3] || 4;
    if (cluster.isMaster) {
        pr('MODE: LOCAL, NODE CLUSTER OF',nworkers);
        isServer = true;
        parallel.init(nworkers);
        global.distExecuteTasks = parallel.pmap;
        evolve();
    } else {
        isServer = false;
    }
} else {
    evolve();
}


