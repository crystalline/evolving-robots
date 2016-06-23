#Experiments with evolving simulated robots  

Every experiment is a simulation of robot interacting with its environment.  
A robot is controlled by a controller which may be any algorithm that transforms observation vectors into action vectors. Currently implemented controllers include Recurrent Neural Network and Linear Perceptron.  
Environment also defines a fitness measure that outputs score at the end of simulation. This score could be used as a guide to evolve increasingly competent robot controllers with a blackbox optimization method such as Genetic Algorithm.

##Experiment 0: "avoid"

In this experiment a puck-shaped robot with 9 distance sensors tries to control its wheels' speeds to avoid driving over balls randomly spawned in its 10x10 area.  
To run this experiment type `node experiment.js`  
You can speed up the experiment by running it in clustered mode: `node experiment.js cluster 3`, tune the number to N-1 of cores available on your machine.  

