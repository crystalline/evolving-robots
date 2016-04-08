
var N = 9

function perceptron1L(inputs, weights, outputs) {
    var i;
    outputs[0] = 0;
    outputs[1] = 0;
    for (i=0; i<N; i++) {
        outputs[0] += inputs[i]*weights[i];
        outputs[1] += inputs[i]*weights[N+i];
    }
    outputs[0] = sigmoid(outputs[0]+weights[2*N+0]);
    outputs[1] = sigmoid(outputs[1]+weights[2*N+1]);
}


//[input, state_t] -> *weights +bias -> [output, state_t+1]
//[ 9 + 8 ] -> *(10 x 17 = 170) +10 -> [2 + 8]

var Nstate = 8;
var Nline = (Nstate+N+1)
var Nweights = (2+Nstate)*Nline;
var Ntemp = Nstate;

Ncoeff = 100;

function harmonicWeightInit(coeff) {
    var i,j;
    var weights = new Array(Nweights);
    for (i=0; i<Nweights; i++) {
        weights[i] = 0;
        for (j=0; j<coeff.length; j += 2) {
            weights[i] += coeff[j] * Math.cos( Math.PI*2*((j/2)+1+coeff[j+1])*i/Nweights );
        }
    }
    return weights;
}

function RNN1L(inputs, state, weights, outputs, temp) {
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


