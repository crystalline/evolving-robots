
var Tensor = require('./tensor.js').Tensor;
var pr = console.log;

function RNN(Ninputs, Noutputs, Nstate,
             W_InSt, W_StSt, W_StOut, initWeights) {
    this.Ni = Ninputs;
    this.No = Noutputs;
    this.Ns = Nstate;
    
    this.state = new Tensor([this.Ns]);
    this.temp = new Tensor([this.Ns]);
    
    this.W_InSt = W_InSt || new Tensor([this.Ns, this.Ni]);
    this.W_StSt = W_StSt || new Tensor([this.Ns, this.Ns]);
    this.W_StOut = W_StOut || new Tensor([this.No, this.Ns]);
    this.params = [this.W_InSt, this.W_StSt, this.W_StOut];
    
    this.Nparams = (this.W_InSt.size + this.W_StSt.size + this.W_StOut.size);
    
    if (initWeights) initWeights(this);
};

function tanh(x) {
    var e = Math.exp(-2.0*x);
    return (1-e)/(1+e);
}

RNN.prototype.compute = function(input, output) {
    this.W_StSt.dot(this.state, this.temp);
    this.W_InSt.dot(input, this.state);
    this.state.add(this.temp);
    this.state.map(tanh);
    this.W_StOut.dot(this.state, output);
};

RNN.prototype.setParamsFromArray = function(arr, offset) {
    offset = offset || 0;
    if ((arr.length-offset) < this.Nparams) {
        pr('Error: Trying to init RNN from an array of insufficient length');
        return;
    }
    this.W_InSt.data = arr;
    this.W_InSt.dataOffset = offset;
    offset += this.W_InSt.size;
    this.W_StSt.data = arr;
    this.W_StSt.dataOffset = offset;
    offset += this.W_StSt.size;
    this.W_StOut.data = arr;
    this.W_StOut.dataOffset = offset;
}

RNN.prototype.reset = function() {
    this.state.init( function (x) { return 0 } );
};

RNN.prototype.print = function() {
    pr('RNN:');
    pr('Ninputs:',this.Ni,'Noutputs:',this.No,'Nstate:',this.Ns,'Nparams:',this.Nparams);
};

function Perceptron(Ninputs, Noutputs, W, initWeights) {
    this.Ni = Ninputs;
    this.No = Noutputs;
    this.temp = new Tensor([this.Ni+1]);
    
    this.W = W || new Tensor([this.No, this.Ni+1]);
    this.Nparams = (this.W.size);
    
    if (initWeights) initWeights(this);
};

Perceptron.prototype.compute = function(input, output) {
    //Extend input with 1 for bias computation
    for (var i=input.dataOffset; i<input.dataOffset+this.Ni; i++) {
        this.temp.data[i] = input.data[i];
    }
    this.temp.data[i] = 1;
    
    this.W.dot(this.temp, output);
    output.map(tanh);
};

Perceptron.prototype.setParamsFromArray = function(arr, offset) {
    offset = offset || 0;
    if ((arr.length-offset) < this.Nparams) {
        pr('Error: Trying to init RNN from an array of insufficient length');
        return;
    }
    this.W.data = arr;
};

Perceptron.prototype.reset = function() {};

Perceptron.prototype.print = function() {
    pr('perceptron:');
    pr('Ninputs:',this.Ni,'Noutputs:',this.No,'Nparams:',this.Nparams);
};

module.exports = {
    RNN: RNN,
    Perceptron: Perceptron
};

