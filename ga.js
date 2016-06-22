
var pr = console.log;
var util = require('./util.js');
var fs = require('fs');

//Default task execution engine
//It is used as a default way of executing fitness assessment
function sExecTasks(tasks, fnname, onComplete) {
    var i;
    var f = global[fnname];
    if (!f) { pr('sExecTasks error: fnname "'+fnname+'" doesn\'t correspond to any global function') }
    var result = new Array(tasks.length);
    for (i=0; i<tasks.length; i++) {
        result[i] = f(tasks[i]);
    }
    if (onComplete) onComplete(result);
}

function timeDiff(startTime, stopTime, digits) {
    digits = digits || 3;
    stopTime = stopTime || Date.now();
    return ((stopTime-startTime)/1000).toFixed(digits)+'s';
}


//Genetic algorithm

//Crude approximation of normal distribution
function randNormal(mean, sigma, random) {
    return sigma*(random()+random()+random()-1.5)+mean;
}

function recombineFloatArrays(genomeA, genomeB, output, params, random) {
    var mean = params.mean;
    var sigma = params.sigma;
    for (i=0; i<genomeA.length; i++) {
        if (random() > 0.5) {
            var weight = random();
            output[i] = weight*genomeA[i] + (1-weight)*genomeB[i];
        }
    }
}

function mutateFloatArrays(genome, params, random) {
    var mutRate = params.mutRate;
    var mean = params.mean;
    var sigma = params.sigma;
    for (i=0; i<genome.length; i++) {
        if (random() < mutRate) {
            genome[i] = randNormal(mean, sigma, random);
        }
    }
}

function descendingOrder(a,b) {
    if (a.fitness > b.fitness) {
        return -1;
    } else {
        return 1;
    }
};

function makeInitRandNormal(genomeSize) {
    return function (i, params, random) {
        var genome = new Array(genomeSize);
        for (j=0; j<genomeSize; j++) {
            genome[j] = randNormal(params.mean, params.sigma, random);
        }
        return genome;
    }
}

// conf: {...} 
// .winners
// .threshold
// .mutInit
// .mutMax
// .mutMin
// .mutFactor
// .mutRestartOnMin
function makeAdaptiveMutRate(conf) {
    var _mutRate = conf.mutInit;
    var _waitCounter = 0;
    var _prevBestFit = 0;
    var _fitStagnationCount = 0;
    return function(gen, bestGenome, bestFitness, parentFit, minFit, avgFit, maxFit, opParams, population, gaconf) {
        var Nbetter = 0;
        var compareFit = parentFit;
        var _start = gaconf.preserveWinners ? gaconf.winners : 0;
        for (var i=_start; i<population.length; i++) {
            if (population[i].fitness > compareFit) { Nbetter++ }
            else { break }
        }
        var change = '-';
        if (Nbetter/population.length > conf.threshold) { change = '+'; _mutRate *= conf.mutFactor }
        else { _mutRate /= conf.mutFactor }
        if (conf.mutRestartOnMin && (_mutRate <= conf.mutMin)) { change = 'restarted(mutMin reached)'; _mutRate = conf.mutInit; }
        _mutRate = Math.min(conf.mutMax, Math.max(conf.mutMin, _mutRate));
           
        //If fitness improvement stagnates for too long, restart mutation rate
        if (conf.mutRestartOnStagnation) {
            if (bestFitness === _prevBestFit) {
                _fitStagnationCount++;
                if (_fitStagnationCount >= conf.mutRestartOnStagnation) { change = 'restarted'; _mutRate = conf.mutInit; }
                _fitStagnationCount = 0;
            } else {
                _prevBestFit = bestFitness;
                _fitStagnationCount = 0;
            }
        }
        
        pr('Mutation Rate ['+change+']:',_mutRate.toFixed(6),'parentFit:',parentFit.toFixed(2),'Nbetter:', Nbetter, 'pop:', population.length);
        
        return {mutRate: _mutRate};
    }
}

function expFall(x, high, low, period, base) {
    return ((high-low)/Math.pow(base, x/period))+low;
}

// conf: {...} 
// initLow
// initHigh
// endHigh
// endLow
// smallPeriod
// largePeriod
// [smallK]
// [base]
function makeExpAnnealingMutRate(conf) {
    return function(gen) {
        var high = expFall(gen, conf.initHigh, conf.endHigh, conf.largePeriod, conf.base || 2);
        var low = expFall(gen, conf.initLow, conf.endLow, conf.largePeriod, conf.base || 2);
        var x = gen % conf.smallPeriod;
        var mRate = expFall(x, high, low, conf.smallPeriod/(conf.smallK || 5), conf.base || 2);
        pr('Mutation Rate:', mRate);
        return {mutRate: mRate};
    }
}

function Individual() {
    this.genome = false;
    this.fitness = false;
    this.s = false;
}

// Run simple GA algorithm to mximize some fitness function
// See lower for configuration example and parameter specs
function runSimpleGA(experiment) {
    
    var conf = experiment;
    
    if (!conf.initParams) { conf.initParams = {}; pr('No initParams given to GA') }
    if (!conf.opParams) { conf.opParams = {}; pr('No opParams given to GA') }
    if (typeof conf.initGenome !== 'function') { pr('No initGenome function given. You need to define it as a function that returns instance of your problem-specific genome') }
    if (typeof conf.copyGenome !== 'function') { conf.copyGenome = util.clone; pr('No copyGenome function given. Using util.clone') }
    
    var executeTasks = conf.executeTasks || sExecTasks;
    if (!conf.executeTasks) pr('Using default serial task executor, pass executeTasks in config to override');
    
    var rootPrng;
    
    if (!conf.prngClass) {
        pr('No PRNG class given, using Math.random as random source');
        var random = Math.random;
        var randInt = function (maxInt) {
            maxInt = maxInt || 2147483647;
            return Math.floor(maxInt*Math.random())
        };
    } else {
        if (!conf.seed) { conf.seed = 41236612; pr('No seed given, initialized to default', conf.seed) }
        rootPrng = new conf.prngClass(conf.seed);
        var random = function () { return rootPrng.next() };
        var randInt = function (maxInt) { if (maxInt) { return rootPrng.nextInt() % maxInt } else { return rootPrng.nextInt() } };
    }
    //if (!random) { random = Math.random; pr('Using Math.random() as random source') }
    
    var population = new Array(conf.popSize);
    var bestGenome = false;
    var bestFitness = -Infinity;
    var i,j,gen;
    
    var mutate = conf.mutate || mutateFloatArrays;
    var recombine = conf.recombine || recombineFloatArrays;
    
    // Initialize population
    for (i=0; i<conf.popSize; i++) {
        population[i] = new Individual();//{};
        
        //Generate separate prng for each genome to ensure determinism even when evolved in parallel        
        if (conf.prngClass) {
            var prng = new conf.prngClass(rootPrng.nextInt()^719237793);
            /*
            for (j=0; j<i; j++) {
                if (population[j].prng.state == prng.state) {
                    pr('prng seed collision');
                    prng = new Prng(rootPrng.nextInt()^119931793);
                }
            }
            */
            
            //Set state of pop element to prng state
            population[i].s = prng.toState();
        }
        
        population[i].genome = conf.initGenome(i, conf.initParams, random);
    }
    
    var parentFit = 0;
    var _timeSinceBest = 0;
    
    function evolveGenerations(onComplete) {
        var t1 = Date.now();
        var t2 = Date.now();
        var t3 = Date.now();
        var history = [];
        
        function processPopulation(result) {
            
            t3 = Date.now();
            pr('Fitness evaluation time:',timeDiff(t2, t3));
            
            var i;
            
            for (i=0; i<conf.popSize; i++) {
                population[i].fitness = result[i].f;
                if (conf.prngClass) { population[i].s = result[i].s || population[i].s }
            }
            
            //Sort by fitness and compute fitness stats
            population.sort(descendingOrder);
            
            var avgFit = 0;
            for (i=0; i<conf.popSize; i++) { avgFit += population[i].fitness }
            avgFit /= conf.popSize;
            
            var minFit = population[population.length-1].fitness;
            var maxFit = population[0].fitness;
            
            if (bestFitness < population[0].fitness) {
                bestFitness = population[0].fitness;
                bestGenome = conf.copyGenome(population[0].genome); //Copy element by element
                _timeSinceBest = 0;
            } else {
                _timeSinceBest++;
                if (conf.bestReseedAfter && _timeSinceBest >= conf.bestReseedAfter) {
                    population[0] = new Individual();
                    population[0].genome = conf.copyGenome(bestGenome);
                    population[0].fitness = bestFitness;
                    pr('[',_timeSinceBest,'gens passed since last bestGenome, reseeding population[0] to bestGenome]');
                    _timeSinceBest = 0;
                }
            }
            
            //history.push({best: bestFitness, avg: avgFit});
            
            //Compute or retrieve parameters that are passed to mutate() and recombine GA operators. These may include mutation rate, etc
            var opParams = conf.opParams;
            if (typeof conf.opParams == 'function') { opParams = conf.opParams(gen, bestGenome, bestFitness, parentFit, minFit, avgFit, maxFit, opParams, population, conf); }
            
            parentFit = 0;
            
            if (conf.preserveWinners) {            
                for (i=0; i<(conf.popSize-conf.winners-conf.losers); i++) {
                    var parentA = population[randInt(conf.winners)];
                    var parentB = population[randInt(conf.winners)];
                    parentFit += (parentA.fitness + parentB.fitness);
                    //Update parents avg fitness
                    recombine(parentA.genome,
                              parentB.genome,
                              population[conf.winners+i].genome,
                              opParams,
                              random);
                }
                //Normalize parentFit
                parentFit /= i*2;
            } else {
                var winners = population.slice(0, conf.winners).map(conf.copyGenome);
                for (i=0; i<(conf.popSize-conf.losers); i++) {
                    var parentA = winners[randInt(conf.winners)];
                    var parentB = winners[randInt(conf.winners)];
                    parentFit += (parentA.fitness + parentB.fitness);
                    //Update parents avg fitness
                    recombine(parentA.genome,
                              parentB.genome,
                              population[i].genome,
                              opParams,
                              random);
                }
                //Normalize parentFit
                parentFit /= i*2;
            }
            
            for (i=1; i<(conf.popSize); i++) {
                mutate(population[i].genome, opParams, random);
            }
            
            if (conf.onGenDone) { conf.onGenDone(gen, bestGenome, bestFitness, parentFit, minFit, avgFit, maxFit, opParams, population) }
            
            if (!conf.silent) {
                pr('Gen '+gen+'; avgFit:'+avgFit+' maxFit: '+maxFit+' bestFit: '+bestFitness+
                (_timeSinceBest ? '\nbestFitness was '+_timeSinceBest+' ago' : '')+
                '\nTime: [total: '+timeDiff(t1)+' fit: '+timeDiff(t2, t3)+' ga: '+timeDiff(t3)+']');
            }
            
            gen = gen + 1;
            if (gen >= conf.generations) {
                if (typeof onComplete == 'function') { process.nextTick(onComplete); }
            } else {
                process.nextTick(function () { evolveGenerations(onComplete) });
            }
        }
        t2 = Date.now();
        executeTasks(population, conf.fitnessFnName, processPopulation);
    }
    
    function onEnd() {
        pr('Stop, '+gen+' generations evaluated\nbest fitness: '+bestFitness+'\nbest genome: '+JSON.stringify(bestGenome));
        fs.writeFileSync('bestgenome.json', JSON.stringify(bestGenome));
        if (conf.onDone) { conf.onDone(bestGenome, bestFitness, gen) };
    }
    
    pr('Start');
    gen = 0;
    evolveGenerations(onEnd);
}

// Tests

prepareGAtest = function() {
    var N = 10;
    var prng = new util.prng(812037);
    //var random = random || Math.random;
    var random = function () { return prng.next() };
    goal = new Array(N);
    var i;
    for (i=0; i<goal.length; i++) {
        goal[i] = random();    
    }
    
    testGAFitness = function(popUnit) {
        var genome = popUnit.genome;
        var acc = 0;
        var i;
        for (i=0; i<genome.length; i++) {
            acc += (genome[i]-goal[i])*(genome[i]-goal[i]);
        }
        var res = {f: -Math.sqrt(acc)};
        return res;
    }
}

function test(parallel, onDone) {
    
    var conf = {
        // Number of genomes in population
        popSize: 30,
        // Number of winners that are selected and recombined at the end of the generation to create new genomes
        winners: 3,
        // Number of losers that are not replaced by newly generated genomes on every generation. They are only mutated
        losers: 5,
        //Preserve winner parents or replace them with offspring too
        preserveWinners: true,
        // Max number of generations to evolve
        generations: 100,
        // Optional prng constructor, use it to enforce deterministic experiments but be careful
        // - if prng's random number quality is bad it will interfere with GA operation.
        // If no prngClass is given a standard Math.random is used everywhere
        prngClass: util.prng,
        // A function that is called as conf.initGenome(conf.initParams) to create genomes for initial population
        initGenome: makeInitRandNormal(10),
        initParams: { mean: 0, sigma: 1},
        // Either a value/object that contains parameters that are passed to mutate & recombine,
        // Or a function that produces these parameters when called like this: conf.opParams(generationNumber, history)
        opParams: { mutRate: 0.03, mean: 0, sigma: 1 },
        // Mutation operator: should change a genome given opParams and random source.
        // mutate(genomeInstance, opParams, random);
        mutate: mutateFloatArrays,
        // Recombination operator: should write new genome into the thrid genome argument given two parent genome arguments,
        // opParams and random source.
        // recombine(genomeParentA, genomeParentB, genomeChild, opParams, random)
        recombine: recombineFloatArrays,
        // Fitness function represents a goal for GA. It should be a global function named conf.fitnessFnName
        // It is called like this: global[conf.fitnessName]({genome: genomeInstance, s:serializableState}) and should
        // return {f: fitnessResultNumber, s: (serializableState or updated serializableState)}
        // s is a [rp[erty that contains individual state, e.g. prng state. It may help to ensure determinism if 
        // population is evaluated in parallel partitioned over a cluster
        fitnessFnName: "testGAFitness",
        //Suppress verbose logging
        silent: false,
        onDone: function (bg, bf) {
            pr('GA test done, goal was='+JSON.stringify(goal));
            if (onDone) onDone(bg, bf);
            else process.exit();
        }
    };
    
    pr('GA test started');
    
    prepareGAtest();
    runSimpleGA(conf);
}

module.exports = {
    test: test,
    runSimpleGA: runSimpleGA,
    makeInitRandNormal: makeInitRandNormal,
    randNormal: randNormal,
    recombineFloatArrays: recombineFloatArrays,
    mutateFloatArrays: mutateFloatArrays,
    makeAdaptiveMutRate: makeAdaptiveMutRate,
    expFall: expFall,
    makeExpAnnealingMutRate: makeExpAnnealingMutRate
}

if (require.main === module) {
    test(false, function () { pr('DONE') });
}

