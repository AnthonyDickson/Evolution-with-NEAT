import {Bodies, Engine, Events, Mouse, MouseConstraint, Render, World} from "matter-js";

import RenderPIXI from "./RenderPIXI";
import {CameraManager} from "./camera";
import {Creature} from "./creature";
import {FINISHED_GENERATION, GET_POPULATION, GET_PROGRESS, QUIT, START, STARTED_GENERATION} from "./messages";
import {createEngine} from "./utils";

// The features wishlist roughly in order of descending priority
// TODO: Name creatures.
// TODO: Add controls to make camera follow the leader
// TODO: Add text displaying camera position along x-axis
// TODO: Show details for best, median and worst performing creatures (text).
// TODO: Implement NEAT
// TODO: Add "scientific" names for creatures based on genome
// TODO: Add controls to navigate between generations (perhaps only store best, median and worst for 
//  all previous generations except the most recent).
// TODO: Add signposts indicating distance
// TODO: Add controls to pan camera to best, median and worst creatures.
// TODO: Add plots to show how fitness evolves over time.
// TODO: Allow user to inspect a creature by clicking on it. Show info about its genome.
// TODO: Change layout of game + plots to be side by side (for large screens).
// TODO: Add ability to save creatures
// TODO: Add ability to save state of the genetic algorithm and restore it.
// TODO: Add controls for restarting genetic algorithm.
// TODO: Get genetic algorithm running on a server.
// TODO: Add ability to design own creature and name it.
// TODO: Allow users to sign in and persist the state of the genetic algorithm and to let run in the background.
// TODO: Add different 'stages' or 'levels'. E.g. bumpy terrain, terrain with obstacles.
// TODO: Make the 'environment'/'stage' be easily changeable/configurable.
// TODO: Add editor for users to make custom stages.
// TODO: Add leaderboards for best creatures for given standard stages.

export function main() {
    const viewportWidth = 800;
    const viewportHeight = 600;

    // TODO: Refactor constants common between main.js and worker.js to a common spot
    const {engine, worldWidth} = createEngine({
        min: {x: -10000, y: 0},
        max: {x: 10000, y: viewportHeight}
    });

    // create a renderer
    const render = RenderPIXI.create({
        element: document.body,
        engine: engine,
        options: {
            width: viewportWidth,
            height: viewportHeight,
            hasBounds: true,
            showAngleIndicator: true,
            wireframes: false,
            background: '#87ceeb' // skyblue
        }
    });

    // add mouse control
    const mouse = Mouse.create(render.canvas),
        mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            },
            collisionFilter: {
                mask: 0
            }

        });

    World.add(engine.world, mouseConstraint);

    const cameraManager = new CameraManager(mouseConstraint);

    function resetView() {
        Render.lookAt(render, {
            min: {x: -0.5 * viewportWidth, y: 0},
            max: {x: 0.5 * viewportWidth, y: viewportHeight}
        });
    }

    const ground = Bodies.rectangle(0, viewportHeight - 30, worldWidth, 60,
        {
            isStatic: true,
            render: {fillStyle: '#573b0c'} // an earthy brown
        });

    World.add(engine.world, ground);

    let population = [];
    let creatures = [];

    function setPopulation(newPopulation) {
        resetView();

        for (const creature of creatures) {
            World.remove(engine.world, creature.phenome);
        }

        population = newPopulation;
        creatures = population.map(genome => new Creature(genome, 0, viewportHeight - 200));

        for (const creature of creatures) {
            World.add(engine.world, creature.phenome);
        }
    }

    Events.on(engine, 'beforeTick', () => {
        cameraManager.onBeforeUpdate(engine, render, mouseConstraint);
    });

    // Make the 'creatures' move to the right... really slowly...
    Events.on(engine, 'beforeUpdate', function (event) {
        for (const creature of creatures) {
            creature.update(event.timestamp);
        }
    });

    Events.on(engine, 'afterUpdate', function () {
        cameraManager.onAfterUpdate(engine, render, mouseConstraint);

        // TODO: Allow the user to toggle between this and controlling the camera manually. Use spacebar to toggle this?
        // // Track the leader
        // const x = Math.max(...creatures.map(creature => creature.getDisplacement()));
        // Render.lookAt(render, {
        //     min: {x: -0.5 * viewportWidth + x, y: 0},
        //     max: {x: 0.5 * viewportWidth + x, y: viewportHeight}
        // });
    });

    // run the engine
    Engine.run(engine);

    // run the renderer
    RenderPIXI.run(render);

    let worker = new Worker('worker.js');

    worker.onmessage = (message) => {
        if (message.data.hasOwnProperty('command')) {
            const messagePrefix = `[${new Date().toLocaleString()}][Main]`;

            switch (message.data.command) {
                case START:
                    console.info(messagePrefix, 'Received START message');
                    break;
                case GET_POPULATION:
                    console.info(messagePrefix, 'Received GET_POPULATION message');
                    setPopulation(message.data.population);
                    break;
                case GET_PROGRESS:
                    console.info(messagePrefix, 'Received GET_PROGRESS message');
                    break;
                case STARTED_GENERATION:
                    console.info(messagePrefix, 'Received STARTED_GENERATION message ');
                    if (message.data.generation % 10 === 0) {
                        setPopulation(message.data.population);
                    }
                    break;
                case FINISHED_GENERATION:
                    console.info(messagePrefix, 'Received FINISHED_GENERATION message');
                    break;
                default:
                    console.warn(`${messagePrefix} Unrecognised message: ${message.data.command}`);
            }
        }
    };

    worker.postMessage({command: START});
    worker.postMessage({command: GET_POPULATION});
    window.onclose = () => worker.postMessage({command: QUIT});
}

