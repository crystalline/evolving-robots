
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

RNN.prototype.compute = function(input, output) {
    this.W_StSt.dot(this.state, this.temp);
    this.W_InSt.dot(input, this.state);
    this.state.add(this.temp);
    this.state.map(Math.tanh);
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
    this.state.init( x => 0 );
};

RNN.prototype.print = function() {
    pr('RNN:');
    pr('Ninputs:',this.Ni,'Noutputs:',this.No,'Nstate:',this.Ns,'Nparams:',this.Nparams);
};

module.exports = {
    RNN: RNN
};

