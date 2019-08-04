import {Bodies, Engine, Events, World} from "matter-js";
import {NodeGenotype} from "./creature";
import {GeneticAlgorithm} from "./ga";
import {FINISHED_GENERATION, GET_POPULATION, GET_PROGRESS, QUIT, START, STARTED_GENERATION} from "./messages";
import {createEngine} from "./utils";

// TODO: Refactor this into a class
export function main() {
    const {engine, worldWidth} = createEngine({
        min: {x: -10000},
        max: {x: 10000},
    });

    /** The `delta` or frames per second which dictates how the physics engine is updated. */
    const fps = 1000 / 60;
    /** How long to spend evaluating each generation in the genetic algorithm. */
    const evaluationTime = 60000; // in milliseconds
    /** How often to log the time step. */
    const timestepLogFrequency = 1000;
    const getLogPrefix = () => `[${new Date().toLocaleString()}][Worker]`;

    // Collision groups.
    const defaultCategory = 0x0001;
    const creatureCategory = 0x0002;

    // Create the ground.
    const ground = Bodies.rectangle(0, 570, worldWidth, 60,
        {
            isStatic: true,
            collisionFilter: {
                category: defaultCategory
            }
        });

    World.add(engine.world, ground);

    NodeGenotype.collisionFilter = {
        category: creatureCategory, // put creatures in their own category
        mask: defaultCategory // only allow creatures to collide with the environment and not each other.
    };

    // Message handling.
    let hasStarted = false;
    let shouldQuit = false;
    let shouldSendPopulation = false;
    let shouldSendProgress = false;

    onmessage = (message) => {
        if (message.data.hasOwnProperty('command')) {
            const messagePrefix = getLogPrefix();

            switch (message.data.command) {
                case START:
                    console.log(messagePrefix, 'Received START message');
                    hasStarted = true;
                    break;
                case GET_POPULATION:
                    console.log(messagePrefix, 'Received GET_POPULATION message');
                    shouldSendPopulation = true;
                    break;
                case GET_PROGRESS:
                    console.log(messagePrefix, 'Received GET_PROGRESS message');
                    shouldSendProgress = true;
                    break;
                case QUIT:
                    console.log(messagePrefix, 'Received QUIT message');
                    shouldQuit = true;
                    break;
                default:
                    console.warn(`${messagePrefix} Unrecognised message: ${message.data.command}`);

            }
        }
    };

    const sendPopulation = () => {
        postMessage({
            command: GET_POPULATION,
            generation: GA.generation,
            population: GA.population
        });

        shouldSendPopulation = false;
    };

    const sendProgress = () => {
        postMessage({
            command: GET_PROGRESS,
            generation: GA.generation,
            progress: GA.creatures.map(creature => creature.getDisplacement())
        });

        shouldSendProgress = false;
    };

    const onGenerationStart = () => {
        postMessage({
            command: STARTED_GENERATION,
            generation: GA.generation,
            population: GA.population
        });
    };

    const onGenerationEnd = () => {
        postMessage({
            command: FINISHED_GENERATION,
            generation: GA.generation,
            population: GA.population,
            results: GA.generationResults
        });
    };

    const GA = new GeneticAlgorithm(engine.world, {
        evaluationTime: evaluationTime,
        onGenerationStart: onGenerationStart,
        onGenerationEnd: onGenerationEnd
    });

    // Make the 'creatures' move to the right... really slowly...
    Events.on(engine, 'beforeUpdate', function (event) {
        GA.update(event.timestamp);
    });

    // main loop
    setInterval(() => {
        if (shouldQuit) {
            clearInterval();
        } else if (hasStarted) {
            if (GA.timeStep % timestepLogFrequency === 0) {
                console.info(`${getLogPrefix()} Time Step: ${GA.timeStep}`);
            }

            GA.update(engine.timing.timestamp);
            Engine.update(engine, fps);

            if (shouldSendPopulation) {
                sendPopulation();
            }

            if (shouldSendProgress) {
                sendProgress();
            }
        }
    });
}

main();
