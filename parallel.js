var cluster = require('cluster');

var pr = console.log;

globNworkers = 4;
workers = [];
taskCallback = false;
waitTask = true;

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
    if (cluster.isWorker) return;
    
    nworkers = nworkers || 4;
    globNworkers = nworkers;
    
    pr('Master pid:' + process.pid + ' started.');
    
    function handleMsg(msg) {
        if (waitTask && msg.msg == 'done') {
            //pr(msg);
            var i;
            var busy = 0;
            for (i=0; i<workers.length; i++) {
                if (workers[i].pid == msg.pid) {
                    workers[i].result = msg.result;
                    workers[i].busy = false;
                } else {
                    if (workers[i].busy == true) busy++;
                }
            }
            //pr(busy);
            if (busy == 0) {
                pr('done');
                var results = [];
                var i;
                for (i=0; i<workers.length; i++) {
                    results.push(workers[i].result);
                }
                var result = Array.prototype.concat.apply([],results);
                //pr(result);
                if (typeof taskCallback == 'function') { taskCallback(result); }
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
        if (msg.msg == 'dotask' && typeof msg.fnname == 'string' && typeof GLOBAL[msg.fnname] == 'function'
            && msg.data && typeof msg.data.length == 'number') {
            var f = GLOBAL[msg.fnname];
            var i;
            var result = new Array(msg.data.length);
            for (i=0; i<msg.data.length; i++) {
                result[i] = f(msg.data[i]);
            }
            process.send({msg: 'done', pid: process.pid, result: result});
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
    for (i=0; i<globNworkers; i++) {
        workers[i].worker.send({msg: 'dotask', fnname: fnname, data: lists[i]});
        workers[i].busy = true;
    };
}

function test() {
    var data = [];
    var out = [];
    for (var i=0; i<999; i++) { data[i] = Math.random() }
    var out1, out2;
    initCluster(4);
    sExecTasks(data, 'sqrOne', function (res) {
        out1 = res;
        pExecTasks(data, 'sqrOne', function (res) {
            out2 = res;
            if (arraysEqual(out1, out2)) { pr('TESTS OK') }
            else { pr('TESTS FAILED!!!') }
            process.exit();
        });
    });
}


module.exports = {
    init: initCluster,
    test: test,
    pmap: pExecTasks,
    smap: sExecTasks
}

if (require.main === module && !cluster.isWorker) {
    test();
}











