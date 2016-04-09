
var ga = require('./ga.js');
var robotsim = require('./robotsim.js');
var util = require('./util.js');
var controllers = require('./controllers.js');
var fs = require('fs');
var cluster = require('cluster');
var pr = console.log;


var simSteps = 20000;
var simDT = 1/50;
var minSpeed = -4;
var maxSpeed = 4;
var maxDistance = maxSpeed*simSteps*simDT;

var controller = new controllers.perceptron1L(9, 2);
var genomeSize = controller.nparams();

robotWorldFitnessMeasure = function(popUnit) {
    
    var genome = popUnit.genome;
    var prng = new util.prng(popUnit.prng.state);// || Math.random;
    
    var model = new robotsim.RobotWorldModel({random: function () { return prng.next() }});
    
    var speed = [0,0];
    var distTraveled = 0;
    var collisionSteps = 0;
    var px = model.x, py = model.y;
    var i;
    
    var visitedSectors = {};
    
    /*
    var temp = new Float32Array(Ntemp);
    var state =  new Float32Array(Ntemp);
    for (i=0; i<Ntemp; i++) { temp[i] = 0; state[i] = 0; }
    
    var weights = harmonicWeightInit(genome);
    */
    var weights = genome;
    
    for (i=0; i<simSteps; i++) {
        model.step(speed, simDT);
        
        //RNN1L(model.vision, state, weights, speed, temp);
        controller.compute(model.vision, speed, weights);
        
        speed[0] = Math.min(maxSpeed, Math.max(minSpeed, speed[0]));
        speed[1] = Math.min(maxSpeed, Math.max(minSpeed, speed[1]));
        
        //distTraveled += L2distance(model.x, model.y, px, py);
        //px = model.x;
        //py = model.y;
        
        visitedSectors[Math.floor(model.x)+Math.floor(model.y)*10] = true;
        
        if (model.onBall) { collisionSteps++; }
    }
    
    var travelArea = Object.keys(visitedSectors).length/100;
    //pr(travelArea);
    var fitness = (-10*collisionSteps/simSteps)+(travelArea);
    
    return {f: fitness, ps: prng.state};
}

if (cluster.isMaster) {
    ga.initCluster();
    pr('genomeSize:',genomeSize);
    ga.executeGA({
        popSize: 50,//2*genomeSize,
        //winners: Math.floor(genomeSize*0.1),
        //losers: Math.floor(genomeSize*0.1),
        winners: 3,
        losers: 10,
        generations: 100,
        genomeSize: genomeSize,//Nweights,//20,
        initMean: 0,
        initSigma: 0.1,
        //mutRate: function (n) { if (n>50) { return 1/genomeSize; } else { return genomeSize/(4*n); } },
        //mutRate: function (n) { if (n>50) { return 1/genomeSize; } else { return genomeSize/(n*n); } },
        //mutRate: function (n) { 1/(genomeSize*Math.sqrt(n)) },
        mutRate: function (n) { 2/(genomeSize*Math.log(n)) },
        fitnessFnName: "robotWorldFitnessMeasure",
        prngConstructor: util.prng,
        genomeConstructor: Float32Array,
        parallel: true,
        onDone: function (bg, bf) {
            pr('Best genome:',bg);
            pr('Best fitness:',bf);
            process.exit();
        }
    });
}




























