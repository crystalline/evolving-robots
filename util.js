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
    prng: function(seed, state) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
        this.state = state || this.seed;
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
util.prng.prototype.next = function () {
    // We know that result of next() will be 1 to 2147483646 (inclusive).
    return (this.nextInt() - 1) / 2147483646;
};
util.prng.prototype.toState = function () { return [this.state, this.seed] };
util.prng.prototype.fromState = function (state) { return new util.prng(state[1], state[0]) };
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

function Bitfield(n) {
    this.d = new Uint32Array(Math.ceil(n/32));
    return this;
}

Bitfield.prototype.get = function(i) {
    var word = i >> 5;
    var bit = i - (word << 5);
    return this.d[word] >> i & 1;
};

Bitfield.prototype.set = function(i, val) {
    var word = i >> 5;
    var bit = i - (word << 5);
    if (val)
        this.d[word] |= (1 << i);
    else
        this.d[word] &= ~(1 << i);
    return val;
};

util.bitfield = Bitfield;

function timeDiff(startTime, digits) {
    digits = digits || 1;
    return ((Date.now()-startTime)/1000).toFixed(digits)+'s';
}

util.timeDiff = timeDiff;

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

var arrayLike = [Array, Uint8Array, Uint8ClampedArray, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array];

function clone(o) {
   if (o === null || typeof o !== 'object') return o;
   var ret, key, value;
   var arrCons;
   if (o.constructor && typeof o.length === 'number' && ((arrCons = arrayLike.indexOf(o.constructor)) !== -1)) {
      ret = new arrayLike[arrCons](o.length);
      for (var i=0; i<o.length; i++) { ret[i] = clone(o[i]) }
      return ret;
   }
   ret = {};
   for (key in o) {
       if (o.hasOwnProperty(key)) {
           value = o[key];
           if (value === null || typeof value !== 'object') { ret[key] = value }
           else { ret[key] = clone(value) }
       }
   }
   return ret;
}

util.clone = clone;


//Russian language utilities

try {
    if (global) {
        module.exports = util;
    }
} catch (e) {}
