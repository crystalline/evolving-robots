
var pr = console.log;

var exitOnAssertFail = true;

function t_assert(cond, err) {
    if (!cond) {
        pr(err);
        if (exitOnAssertFail) {
            pr('Exit: assertion failure');
            process.exit(-1);
        }
    }
}

function arr2str(arr) {
    if (arr.length === 0) return '[]';
    var str = '[';
    for (var i=0; i<arr.length-1; i++) {
        str += arr[i];
        str += ',';
    }
    str += arr[i];
    str += ']';
    return str;
}

function compareArrays(a,b) {
    if (a.length === b.length) {
        for (var i=0; i<a.length; i++) { if (a[i] !== b[i]) return false }
        return true;
    }
}

function every(arr, pred) {
    for (var i=0; i<arr.length; i++) { if (!pred(arr[i])) return false }
    return true;
}

function reduce(arr, fn) {
    if (arr.length < 2) return arr[0];
    else {
        var acc = fn(arr[0], arr[1]);
        for (var i=2; i<arr.length; i++) {
            acc = fn(acc, arr[i]);
        }
        return acc;
    }
}

//Shape: array of dimensions in row-major order
//For vectors        shape = [vector_length]
//For matrices       shape = [matrix_height, matrix_width]
//For rank 3 tensors shape = [tensor3_depth, tensor3_height, tensor3_width]

function isInteger(x) {
    return x === Math.floor(x);
}

function Tensor(arg0, arg1, arg2) {
    
    var shape = arg0;
    var data = arg1;
    var offset = arg2;
    offset = offset || 0;
    
    if (arg0.length && every(arg0, isInteger) && arg1 === undefined && arg2 === undefined) {
        data = new Float32Array(reduce(arg0, function (a,b) { return a*b }));
        offset = 0;
    }
    
    this.shape = new Uint32Array(shape);
    this.rank = shape.length;
    this.data = data;
    this.dataOffset = offset;
    
    this.stride = new Uint32Array(this.rank);
    for (var i=1; i<this.rank; i++) {
        var acc = 0;
        for (var j=i; j<this.rank; j++) { acc += this.shape[j] }
        this.stride[i-1] = acc;
    }
    this.stride[this.rank-1] = 1;
    
    this.size = this.shape[0]*this.stride[0];
};

Tensor.isTensor = function (t) { return t instanceof Tensor };

Tensor.prototype.get = function() {
    t_assert(arguments.length === this.shape.length, 'Error: wrong get arguments');
    var off = this.dataOffset;
    for (var i=0; i<arguments.length; i++) {
        off += this.stride[i]*arguments[i];
    }
    return this.data[off];
};

Tensor.prototype.set = function() {
    t_assert(arguments.length === (this.shape.length+1), 'Error: wrong set arguments');
    var off = this.dataOffset;
    for (var i=0; i<arguments.length-1; i++) {
        off += this.stride[i]*arguments[i];
    }
    return this.data[off] = arguments[arguments.length-1];
};

Tensor.prototype.equalShape = function(t) {
    t_assert(t instanceof Tensor, 'Error: wrong equalShape argument');
    return compareArrays(this.shape, t.shape);
};

Tensor.prototype.print = function() {
    pr('Tensor: rank='+this.shape.length+' shape='+arr2str(this.shape)+' stride='+arr2str(this.stride));
    if (this.shape.length === 1) {
        var str = '[';
        for (var i=this.dataOffset; i<(this.dataOffset+this.shape[0]); i++) {
            str += this.data[i];
            if (i !== (this.dataOffset+this.shape[0])-1) str += ',';
        }
        str += ']';
        pr('data:\n'+str);
    } else if (this.shape.length === 2) {
        var str = '[';
        for (var i=0; i<this.shape[0]; i++) {
            if (i>0) str += ' ';
            str += '[';
            for (var j=0; j<this.shape[1]; j++) {
                str += this.get(i, j);
                if (j<this.shape[1]-1) str += ',';
            }
            str += ']'
            if (i<this.shape[0]-1) str += '\n';
        }
        str += ']';
        pr('data:\n'+str);
    } else {
        pr('Viewing data for tensors with rank > 2 is not implemented');
    }
};

function binaryTensorOp(fn, tensorA, tensorB, optDstTensor) {
    t_assert(Tensor.isTensor(tensorA) && Tensor.isTensor(tensorB) && tensorA.equalShape(tensorB), 'Error: wrong tensor shapes');
    if (optDstTensor) { t_assert(Tensor.isTensor(optDstTensor) && tensorA.equalShape(optDstTensor), 'Error: wrong tensor shapes') }
    
    var dst = optDstTensor ? optDstTensor : tensorA;
    
    var taCursor = tensorA.dataOffset;
    var tbCursor = tensorB.dataOffset;
    var dstCursor = dst.dataOffset;
    var tad = tensorA.data;
    var tbd = tensorB.data;
    var tdd = dst.data;
    var N = tensorA.size;
    
    if (dst === tensorA) {
        for (var i=0; i<N; i++) {
            tad[taCursor] = fn(tad[taCursor++], tbd[tbCursor++]);
        }
    } else {
        for (var i=0; i<N; i++) {
            tdd[dstCursor++] = fn(tad[taCursor++], tbd[tbCursor++]);
        }
    }
    
    return optDstTensor;
    
    /*
    if (Tensor.isTensor(tensor) && Tensor.isTensor(tsrc2) && tsrc1.equalShape(tsrc2)) {
        var aoff
        for (var i=0; i<this.size; i++) {
            
        }
    } else if (Number.isInteger (value)) {
        
    } else { pr('Error in Tensor.prototype.add') }
    */
}

Tensor.prototype.map = function(fn, outTensor) {
    if (outTensor) {
        t_assert(Tensor.isTensor(outTensor) && this.equalShape(outTensor), 'Error: wrong tensor shapes');
        var outCursor = outTensor.dataOffset;
        var outData = outTensor.data;
        var cursor = this.dataOffset;
        var data = this.data;
        var N = cursor+this.size;
        for (var i=cursor; i<N; i++) { outData[outCursor++] = fn(data[i]) }
    } else {
        var cursor = this.dataOffset;
        var data = this.data;
        var N = cursor+this.size;
        for (var i=cursor; i<N; i++) { data[i] = fn(data[i]) }
    }
};

Tensor.prototype.init = function(fn) {
    var cursor = this.dataOffset;
    var data = this.data;
    var N = cursor+this.size;
    for (var i=cursor; i<N; i++) { data[i] = fn(i) }
};

/*
Tensor.prototype.add = function(value, dst) {
    if (value instanceof Tensor && this.equalShape(value) ) {
        var aoff
        for (var i=0; i<this.size; i++) {
            
        }
    } else if (Number.isInteger (value)) {
        
    } else { pr('Error in Tensor.prototype.add') }
}
*/

Tensor.prototype.add = function (tensorArg, tensorDstOpt) {
    binaryTensorOp( function (a,b) { return a+b }, this, tensorArg, tensorDstOpt);
};
Tensor.prototype.subtract = function (tensorArg, tensorDstOpt) {
    binaryTensorOp( function (a,b) { return a-b }, this, tensorArg, tensorDstOpt);
};
Tensor.prototype.multiply = function (tensorArg, tensorDstOpt) {
    binaryTensorOp( function (a,b) { return a*b }, this, tensorArg, tensorDstOpt);
};
Tensor.prototype.divide = function (tensorArg, tensorDstOpt) {
    binaryTensorOp( function (a,b) { return a/b }, this, tensorArg, tensorDstOpt);
};

function mulMatrixVector(matrix, inVector, outVector) {
    t_assert(matrix.rank === 2, 'Error: not a matrix');
    t_assert(inVector.rank === 1, 'Error: not a vector');
    t_assert(outVector.rank === 1, 'Error: not a vector');
    t_assert(inVector.shape[0] === matrix.shape[1] && outVector.shape[0] === matrix.shape[0], 'Error: wrong shapes in mat x vector');
    
    var mw = matrix.shape[1];
    var mh = matrix.shape[0];
    var md = matrix.data;
    var ivd = inVector.data;
    var ovd = outVector.data;
    var mBase = matrix.dataOffset;
    var invBase = inVector.dataOffset;
    var outvBase = outVector.dataOffset;
    
    var ivCursor;
    var mCursor = mBase;
    var odCursor = outvBase;
    
    for (var i=0; i<mh; i++) {
        var acc = 0;
        ivCursor = invBase;
        mCursor = mBase+mw*i;
        for (var j=0; j<mw; j++) {
            acc += ivd[ivCursor++]*md[mCursor++];
        }
        ovd[odCursor+i] = acc;
    }
}

Tensor.prototype.dot = function(inVector, outVector) {
    t_assert(this.rank === 2 && inVector.rank === 1 && outVector.rank === 1, 'Error, Tensor.prototype.dot is implemented only for matrix * vector for now');
    mulMatrixVector(this, inVector, outVector);
};

function testTensor() {
    var fail = false;    
    var test_i = 0;
    function _test(cond) {
        if (!cond) { fail = true; pr('TEST',test_i,'FAILED') };
        test_i++;
    }
    
    var t1 = new Tensor([2,3],[1,2,3,4,5,6]);
    var t2 = new Tensor([3],[1,2,3]);
    var t3 = new Tensor([2],[1,1]);
    t1.print();
    t2.print();
    t3.print();
    
    mulMatrixVector(t1, t2, t3);
    t3.print();
    _test(t3.data[0] === 14 && t3.data[1] === 32);
    _test(t3.get(0) === 14 && t3.get(1) === 32);
    
    var t4 = new Tensor([2],[0,0,1,1],2);
    mulMatrixVector(t1, t2, t4);
    t4.print();
    _test(t4.data[2] === 14 && t4.data[3] === 32);
    _test(t4.get(0) === 14 && t4.get(1) === 32);
    
    var t5 = new Tensor([3],[1,2,3]);
    var t6 = new Tensor([3],[1,2,3]);
    t5.add(t6);
    t5.print();
    _test(compareArrays(t5.data, [2,4,6]));
    
    var t7 = new Tensor([3],[1,2,3]);
    t7.divide(t6);
    t7.print();
    _test(compareArrays(t7.data, [1,1,1]));
    
    var t8 = new Tensor([3]);
    t8.print();
    var t9 = new Tensor([3,4]);
    t9.print();    
    
    var t10 = new Tensor([3], [1,2,3]);
    t10.map( function (x) { return x*x*x } );
    t10.print();
    _test(compareArrays(t10.data, [1,8,27]));
    
    if (fail) {
        pr('TESTS FAILED');
    } else {
        pr('TESTS PASSED');    
    }
}

module.exports = {
    Tensor: Tensor,
    t_assert: t_assert,
    test: testTensor
}

if (require.main === module) {
    testTensor();
}

