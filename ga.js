var cluster = require('cluster');
var fs = require('fs');
var pr = console.log;
var util = require('./util.js');

var numCpus = require('os').cpus().length;

//Cluster bookkeeping

globNworkers = 4;
workers = [];
taskCallback = false;
waitTask = true;
expectResult = false;

addOne = function(x) { return x+1; }
sqrOne = function(x) { return x*x; }

function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function initCluster(nworkers) {
    
    if (workers.length) return;
    
    nworkers = nworkers || 4;
    globNworkers = nworkers;
    
    pr('Master pid:' + process.pid + ' started.');
    
    function handleMsg(msg) {
        //pr('handleMsg');
        if (waitTask && msg.msg == 'done') {
            var i;
            var busy = 0;
            for (i=0; i<workers.length; i++) {
                if (workers[i].pid == msg.pid) {
                    if (expectResult) { workers[i].result = msg.result; }
                    workers[i].busy = false;
                } else {
                    if (workers[i].busy == true) busy++;
                }
            }
            //pr(busy);
            if (busy == 0) {
                //pr('Done pExecTasks()');
                if (expectResult) {
                    var results = [];
                    var i;
                    for (i=0; i<workers.length; i++) {
                        results.push(workers[i].result);
                    }
                    var result = Array.prototype.concat.apply([],results);
                    if (typeof taskCallback == 'function') { taskCallback(result); }
                } else {
                    if (typeof taskCallback == 'function') { taskCallback(); }                
                }
                //pr(result);
            }
        }
    }
    
    //Fork workers.
    var i;
    for (i=0; i<globNworkers; i++) {
        var worker = cluster.fork();
        workers[i] = {worker: worker, pid: worker.process.pid, busy: false, result: []};
        
        //Receive messages from this worker and handle them in the master process.
        worker.on('message', handleMsg);
        
        //Send a message from the master process to the worker.
        //worker.send({msg: 'ping', pid: process.pid});
    }
    // Be notified when worker processes die.
    cluster.on('death', function(worker) {
        pr('Worker ' + worker.pid + ' died.');
    });
}
 
if (cluster.isWorker) {
    pr('Worker pid:' + process.pid + ' started.');
 
    // Send message to master process.
    //process.send({msg: 'ready', pid: process.pid});
 
    // Receive messages from the master process.
    process.on('message', function(msg) {
        //pr('Worker ' + process.pid + ' received message from master.', msg);
        
        if (msg.msg == 'execfn' && typeof msg.fnname == 'string'
            && typeof GLOBAL[msg.fnname] == 'function') {
            
            var f = GLOBAL[msg.fnname];
            
            f();
            
            process.send({msg: 'done', pid: process.pid});
            
        } else if (msg.msg == 'dotask' && typeof msg.fnname == 'string'
            && typeof GLOBAL[msg.fnname] == 'function'
            && msg.data && typeof msg.data.length == 'number') {
            
            var f = GLOBAL[msg.fnname];
            var i;
            var result = new Array(msg.data.length);
            for (i=0; i<msg.data.length; i++) {
                result[i] = f(msg.data[i]);
            }
            
            process.send({msg: 'done', pid: process.pid, result: result});
        } else {
            pr('Worker ' + process.pid + ' message error: cannot decode');
        }
    });
}

function sExecTasks(tasks, fnname, onComplete) {
    var i;
    var f = GLOBAL[fnname];
    if (!f) { pr('sExecTasks error: fnname "'+fnname+'" doesn\'t correspond to any global function') }
    var result = new Array(tasks.length);
    for (i=0; i<tasks.length; i++) {
        result[i] = f(tasks[i]);
    }
    onComplete(result);
}

function pExecTasks(tasks, fnname, onComplete) {
    //pr('Start pExecTasks(), tasks.length='+tasks.length+', fnname="'+fnname+'"');
    var i,j;
    var f = GLOBAL[fnname];
    if (!f) { pr('sExecTasks error: fnname "'+fnname+'" doesn\'t correspond to any global function') }
      
    var lists = new Array(globNworkers);
    for (i=0; i<globNworkers; i++) { lists[i] = [] };
    
    if (tasks.length < workers.length) {
        for (i=0; i<tasks.length; i++) {
            lists[i].push(tasks[i]);
        }
    } else {
        var N = Math.floor(tasks.length/workers.length);
        for (i=0; i<workers.length; i++) {
            if (i == workers.length-1) {
                for (j=i*N; j<tasks.length; j++) {
                    lists[i].push(tasks[j]);
                }
            } else {
                for (j=0; j<N; j++) {
                    lists[i].push(tasks[j+i*N]);
                }
            }
        }
    }
    
    taskCallback = onComplete;
    waitTask = true;
    expectResult = true;
    
    for (i=0; i<globNworkers; i++) {
        workers[i].worker.send({msg: 'dotask', fnname: fnname, data: lists[i]});
        workers[i].busy = true;
    };
}


function pExecFn(fnname, onComplete) {
    //pr('Start pExecFn(), fnname="'+fnname+'"');
    var i;
    var f = GLOBAL[fnname];
    if (!f) { pr('sExecTasks error: fnname "'+fnname+'" doesn\'t correspond to any global function') }
        
    taskCallback = onComplete;
    waitTask = true;
    expectResult = false;
    
    for (i=0; i<globNworkers; i++) {
        workers[i].worker.send({msg: 'execfn', fnname: fnname});
        workers[i].busy = true;
    };
}


function testCluster(onDone) {
    var data = [];
    var out = [];
    for (var i=0; i<999; i++) { data[i] = Math.random() }
    var out1, out2;
    initCluster(numCpus);
    pr('Start Cluster Tests');
    sExecTasks(data, 'sqrOne', function (res) {
        out1 = res;
        pExecTasks(data, 'sqrOne', function (res) {
            out2 = res;
            if (arraysEqual(out1, out2)) { pr('Cluster TESTS OK') }
            else { pr('Cluster TESTS FAILED!!!') }
            if (onDone) { onDone() }
            else { process.exit() }
        });
    });
}

//Genetic algorithm

function randNormal(mean, sigma, random) {
    return sigma*(random()+random()+random()-1.5)+mean;
}

function recombine(genomeA, genomeB, output, random) {
    //random = random || Math.random;
    for (i=0; i<genomeA.length; i++) {
        if (random() > 0.5) {
            var weight = random();
            output[i] = weight*genomeA[i] + (1-weight)*genomeB[i];
        }
    }
}

function mutate(genome, rate, mean, sigma, random) {
    //random = random || Math.random;
    for (i=0; i<genome.length; i++) {
        if (random() < rate) {
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


function executeGA(experiment) {
    
    var conf = experiment;
    
    if (!conf.prngConstructor) {
        pr('No PRNG class given, aborting');
    }
    
    if (!conf.seed) {
        conf.seed = 41236612;
        pr('No seed given, initialized to default',conf.seed);
    }
    
    if (!conf.genomeConstructor) {
        conf.genomeConstructor = Array;
    }
    
    var rootPrng = new conf.prngConstructor(conf.seed);
    
    var random = function () { return rootPrng.next() };
    var randInt = function (maxInt) { if (maxInt) { return rootPrng.nextInt() % maxInt } else { return rootPrng.nextInt() } };
    //if (!random) { random = Math.random; pr('Using Math.random() as random source') }
    
    var population = new Array(conf.popSize);
    var bestGenome = false;
    var bestFitness = -Infinity;
    var i,j,gen;
    
    for (i=0; i<conf.popSize; i++) {
        population[i] = {};
        
        //Generate separate prng for each genome to ensure determinism even when evolved in parallel
        var prng = new conf.prngConstructor(rootPrng.nextInt());
        
        for (j=0; j<i; j++) {
            if (population[j].prng.state == prng.state) {
                pr('prng seed collision');
                prng = new Prng(rootPrng.nextInt());
            }
        }
        
        population[i].prng = prng;
        population[i].random = function () { return prng.next() };
        population[i].genome = new conf.genomeConstructor(conf.genomeSize);
        
        var genome = population[i].genome;
        for (j=0; j<conf.genomeSize; j++) {
            genome[j] = randNormal(conf.initMean, conf.initSigma, random);
        }
    }
       
    function evolveGeneration(onComplete) {
        
        var t1 = Date.now();
        var fitResult;
        var fitnessMeasure = GLOBAL[conf.fitnessFnName];
        
        for (i=0; i<conf.popSize; i++) {
            fitResult = fitnessMeasure(population[i]);
            population[i].fitness = fitResult.f;
            population[i].prng.state = fitResult.ps;
        }
        
        population.sort(descendingOrder);
        
        if (bestFitness < population[0].fitness) {
            bestFitness = population[0].fitness;
            bestGenome = population[0].genome.slice(); //Copy element by element
            GLOBAL.bestFitness = bestFitness;
            GLOBAL.bestGenome = bestGenome;
        }
        
        for (i=0; i<(conf.popSize-conf.winners-conf.losers); i++) {
            recombine(population[randInt(conf.winners)].genome,
                      population[randInt(conf.winners)].genome,
                      population[conf.winners+i].genome,
                      random);
        }
        
        var mutRate;
        if (typeof conf.mutRate == 'function') { mutRate = conf.mutRate(gen); }
        else { mutRate = conf.mutRate };
        
        for (i=0; i<(conf.popSize); i++) {
            mutate(population[i].genome, mutRate, conf.initMean, conf.initSigma, random);
        }
        
        var t2 = Date.now();
        var seconds = (t2-t1)/1000;
        
        if (!conf.silent) pr('Gen '+gen+'; gen_best: '+population[0].fitness+' overall_best: '+bestFitness+' time: '+seconds);
        if (gen % 10 == 0) fs.writeFileSync('bestgenome.json', JSON.stringify(bestGenome));
    
    }
    
    function evolveGenerations(onComplete) {
        var t1 = Date.now();
        
        function processPopulation(result) {
            
            var i;
            var fitAvg = 0;
            
            for (i=0; i<conf.popSize; i++) {
                population[i].fitness = result[i].f;
                population[i].prng.state = result[i].ps;
                fitAvg += result[i].f;
            }
            
            fitAvg /= conf.popSize;
            
            population.sort(descendingOrder);
            
            if (bestFitness < population[0].fitness) {
                bestFitness = population[0].fitness;
                bestGenome = population[0].genome.slice(); //Copy element by element
                GLOBAL.bestFitness = bestFitness;
                GLOBAL.bestGenome = bestGenome;
            }
            
            for (i=0; i<(conf.popSize-conf.winners-conf.losers); i++) {
                recombine(population[randInt(conf.winners)].genome,
                          population[randInt(conf.winners)].genome,
                          population[conf.winners+i].genome,
                          random);
            }
            
            var mutRate;
            if (typeof conf.mutRate == 'function') { mutRate = conf.mutRate(gen); }
            else { mutRate = conf.mutRate };
            
            for (i=1; i<(conf.popSize); i++) {
                mutate(population[i].genome, mutRate, conf.initMean, conf.initSigma, random);
            }
            
            var t2 = Date.now();
            var seconds = (t2-t1)/1000;
            
            if (!conf.silent) pr('Gen '+gen+'; avg:'+fitAvg+' gen_best: '+population[0].fitness+' overall_best: '+bestFitness+' time: '+seconds);
                if (gen % 10 == 0) fs.writeFileSync('bestgenome.json', JSON.stringify(bestGenome));
                
            gen = gen + 1;
            if (gen >= conf.generations) {
                if (typeof onComplete == 'function') { process.nextTick(onComplete); }
            } else {
                process.nextTick(function () { evolveGenerations(onComplete) });
            }
        }
        //pr('pop',population.length);
        if (conf.parallel) {
            pExecTasks(population, conf.fitnessFnName, processPopulation);
        } else {
            sExecTasks(population, conf.fitnessFnName, processPopulation);
        }
    }
    
    function onEnd() {
        pr('Stop, '+gen+' generations evaluated\nbest fitness: '+bestFitness+'\nbest genome: '+JSON.stringify(bestGenome));
        fs.writeFileSync('bestgenome.json', JSON.stringify(bestGenome));
        if (conf.onDone) { conf.onDone(bestGenome, bestFitness) };
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
        popSize: 30,
        winners: 3,
        losers: 5,
        generations: 100,
        genomeSize: 10,
        initMean: 0,
        initSigma: 1,
        mutRate: 0.03,
        fitnessFnName: "testGAFitness",
        parallel: false,
        prngConstructor: util.prng,
        silent: true,
        onDone: function (bg, bf) {
            pr('GA test done, goal was='+JSON.stringify(goal));
            if (onDone) onDone(bg, bf);
            else process.exit();
        }
    };
    
    pr('GA test started');
    
    prepareGAtest();
    executeGA(conf);
}

module.exports = {
    test: test,
    executeGA: executeGA
}

if (require.main === module && cluster.isMaster) {

    initCluster(numCpus);
    
    testCluster(function () {
        pExecFn('prepareGAtest', function () {
            test(false, function (bestGenomeSer) {
                test(true, function (bestGenomePar) {
                    if (arraysEqual(bestGenomeSer, bestGenomePar)) {
                        pr('SERIAL VS PARALLEL EVOLUTION OUTCOME IDENTICAL');
                        pr('TESTS OK');
                        process.exit();
                    }
                });
            });
        });
    });
}

