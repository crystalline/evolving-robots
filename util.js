//JS utility functions

util = {
    isNumeric: function(n) {
        return !isNaN(n) && isFinite(n);
    },
    simpleExtend: function(dst, src) {
        for (var k in src) {
            if (src.hasOwnProperty(k)) {
                dst[k] = src[k];
            }
        }
        return dst;
    },
    pushBack: function(dst, src) {
        var i;
        var start = dst.length;
        for (i=0; i<src.length; i++) {
            dst[start+i] = src[i];
        }
        return dst;
    },
    arrayShuffle: function (array, random) {
        random = random || Math.random;
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    },
    abstractShuffle: function (length, swapFn, random) {
        random = random || Math.random;
        for (var i = length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            swapFn(i,j);
        }
    },
    extend: function() {
        if (arguments.length > 1) {
            var i;
            for (i=1; i<arguments.length; i++) {
                this.simpleExtend(arguments[0], arguments[i]);
            }
        }
        return arguments[0];
    },
    stringHash: function(str) {
        var hash = 0, i, chr, len;
        if (str.length == 0) return hash;
        for (i = 0, len = str.length; i < len; i++) {
            chr   = str.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    },
    //Find all locations of substring in string
    locations: function(substring, string){
        var a = [], i = -1;
        while((i = string.indexOf(substring, i+1)) >= 0) a.push(i);
        return a;
    },
    //Very simple pseudorandom number generator
    prng: function(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
        this.state = this.seed;
    },
    //Simple tracker of an average value
    avgTracker: function() {
        this.x = 0;
        this.N = 0;
    },
    pairSet: function() {
        this.d = {};
    }
};

//pairSet
util.pairSet.prototype.add = function (x, y) {
    if (!this.d[x]) this.d[x] = {};
    this.d[x][y] = true;
    if (!this.d[y]) this.d[y] = {};
    this.d[y][x] = true;
};

util.pairSet.prototype.remove = function (x, y) {
    delete this.d[x][y];
    delete this.d[y][x];
};

util.pairSet.prototype.check = function (x, y) {
    return this.d[x] && this.d[x][y];
};

//Avg Tracker
util.avgTracker.prototype.update = function(next) {
    this.x += (1/(this.N+1))*(next-this.x);
    this.N++;
};

util.avgTracker.prototype.getRounded = function(N) {
    return Math.round(this.x*N)/N;
};

//PRNG
util.prng.prototype.nextInt = function () {
    return this.state = this.state * 16807 % 2147483647;
};

util.prng.prototype.getState = function () {
    return this.state;
};

util.prng.prototype.next = function () {
    // We know that result of next() will be 1 to 2147483646 (inclusive).
    return (this.nextInt() - 1) / 2147483646;
};

util.prng.prototype.reset = function() { this.state = this.seed };

util.prng.prototype.test = function() {
    var s = 0;
    for (var i = 0; i<1000; i++) {
        s += this.next();
    }
    console.log('Testing prng, seed= '+this.seed);
    console.log('Expected value: '+s/1000);
    this.reset();
};

//ProgressMeter
var readline = require('readline');

var rl = false;

function ProgressMeter(progFn, units) {
    if (!rl) { 
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    this.start = Date.now();
    this.time = this.start;
    this.units = units || 'chars';
    this.progFn = progFn || function (x) { return x; }
    console.log('Progress: '+this.progFn(0)+' '+this.units);
    return this;
}

ProgressMeter.prototype.progress = function (counter) {
    var t = Date.now();
    if (t - this.time > 50) {
        this.time = t
        readline.clearLine(rl, -1);
        readline.moveCursor(rl, 0, -1);
        console.log('Progress: '+this.progFn(counter)+' '+this.units);    
    }
};

ProgressMeter.prototype.end = function (counter) {
    readline.clearLine(rl, 0);
    readline.moveCursor(rl, 0, -1);
    console.log('Progress: '+this.progFn(counter)+' '+this.units);
};

util.ProgressMeter = ProgressMeter;

//Levenstein distance

function levenDist(str1, str2) {
    // base cases
    if (str1 === str2) return 0;
    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    // two rows
    var prevRow  = new Array(str2.length + 1), curCol, nextCol, i, j, tmp;

    // initialise previous row
    for (i=0; i<prevRow.length; ++i) {
        prevRow[i] = i;
    }
    
    // calculate current row distance from previous row
    for (i=0; i<str1.length; ++i) {
        nextCol = i + 1;

        for (j=0; j<str2.length; ++j) {
            curCol = nextCol;
            // substution
            nextCol = prevRow[j] + ( (str1.charAt(i) === str2.charAt(j)) ? 0 : 1 );
            // insertion
            tmp = curCol + 1;
            if (nextCol > tmp) {
                nextCol = tmp;
            }
            // deletion
            tmp = prevRow[j + 1] + 1;
            if (nextCol > tmp) {
                nextCol = tmp;
            }
            // copy current col value into previous (in preparation for next iteration)
            prevRow[j] = curCol;
        }

        // copy last col value into previous (in preparation for next iteration)
        prevRow[j] = nextCol;
    }

    return nextCol;
}

util.levenDist = levenDist;

//return array of {k: key, v: value} objects sorted by getNumber(obj[key], key) (or by key if
//getNumber is not given
//in descending (high first) order
function sortObject(obj, getNumber) {
    var ret = [];
    for (key in obj) {
        ret.push({k: key, v: obj[key]});
    }
    if (getNumber) return ret.sort(function (a,b) { return getNumber(b.v, b.k) - getNumber(a.v, a.k) })
    else return ret.sort(function (a,b) { return b.v - a.v })
}

util.sortObject = sortObject;

//Russian language utilities

try {
    if (GLOBAL) {
        module.exports = util;
    }
} catch (e) {}
