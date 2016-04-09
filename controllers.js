
var pr = console.log;

perceptron1L.prototype.compute = function(input, output, params) {
    
    output = output || new Float32Array(this.no);
    var i,j, base, bias, out;
    var weights = params || this.w;
    
    for (j=0; j<this.no; j++) {
        base = j*this.ni+1;
        bias = weights[base+this.ni];
        out = bias;
        for (i=0; i<this.ni; i++) {
            out += input[i]*weights[base+i];
        }
        output[j] = out;
    }
}

perceptron1L.prototype.nparams = function () {
    return this.no*(this.ni+1);
}

function perceptron1L(Ninputs, Noutputs, weights) {
    this.ni = Ninputs;
    this.no = Noutputs;
    this.w = weights;
}

function perceptron1L(Ninputs, Noutputs, weights) {
    this.ni = Ninputs;
    this.no = Noutputs;
    this.w = weights;
}

var layers = {
    'dense':{},
    'conv':{},
    'pool':{}
}

function FNN(struct, weights) {
    
}

/*

RNN.prototype.compute = function(input, output, params) {
    var i,j;
    var base;
    for(i=0; i<2; i++) {
        base = i*Nline;
        outputs[i] = 0;
        for(j=0; j<Nstate; j++) {
            outputs[i] += weights[base+j] * state[j];
        }
        base += Nstate;
        for(j=0; j<N; j++) {
            outputs[i] += weights[base+j] * inputs[j];
        }
        base += N;
        outputs[i] += weights[base];
        outputs[i] = sigmoid(outputs[i]);
    }
    for(i=0; i<Nstate; i++) {
        base = (i+2)*Nline;
        temp[i] = 0;
        for(j=0; j<Nstate; j++) {
            temp[i] += weights[base+j] * state[j];
        }
        base += Nstate;
        for(j=0; j<N; j++) {
            temp[i] += weights[base+j] * inputs[j];
        }
        base += N;
        temp[i] += weights[base];
        temp[i] = sigmoid(temp[i]);
    }
    for(i=0; i<Nstate; i++) {
        state[i] = temp[i];
    }
}

function RNN(Ninputs, Noutputs, weights) {
    this.ni = Ninputs;
    this.no = Noutputs;
    this.w = weights;
}


*/

module.exports = {
    perceptron1L: perceptron1L
}


