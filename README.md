# evolving-robots

Experiments with evolving simulated robots

Every experiment is a simulation of robot interacting with its environment. A robot is controller by a controller which may be any algorithm that transforms observation vectors into action vectors. Currently implemented controllers are Recurrent Neural Network and Linear Perceptron.
Environment also defines a fitness measure that outputs score at the end of simulation. This score could be used as a guide to evolve increasingly competent robot controllers with a blackbox optimization method such as Genetic Algorithm.

## Experiment 0: "avoid"

In this experiment a puck-shaped robot with 9 distance sensors tries to avoid driving over balls in its 10x10 area.
To run this experiment type `node experiment.js`

