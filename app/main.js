import {Bodies, Engine, Events, Mouse, MouseConstraint, Render, World} from "matter-js";


import {CameraManager} from "./camera";
import {Creature, CreatureGenome, NodeGenotype} from "./creature";

export function main() {
    // create an engine
    const engine = Engine.create();

    engine.world.bounds.min.x = -1000;
    engine.world.bounds.min.y = 0;
    engine.world.bounds.max.x = 1000;
    engine.world.bounds.max.y = 600;
    const worldWidth = Math.abs(engine.world.bounds.max.x) + Math.abs(engine.world.bounds.min.x);

    // create a renderer
    const render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: 800,
            height: 600,
            hasBounds: true,
            showAngleIndicator: true,
            wireframes: false,
            background: '#87ceeb' // skyblue
        }
    });

    Render.lookAt(render, {
        min: {x: -400, y: 0},
        max: {x: 400, y: 600}
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
            }
        });

    World.add(engine.world, mouseConstraint);


    const defaultCategory = 0x0001,
        creatureCategory = 0x0002;

    const groundStyle = {fillStyle: '#573b0c'}; // earthy brown

    // create two boxes and a ground
    const ground = Bodies.rectangle(0, 570, worldWidth, 60,
        {
            isStatic: true,
            render: groundStyle,
            collisionFilter: {
                category: defaultCategory
            }
        });

    // add all of the bodies to the world
    World.add(engine.world, ground);

    const cameraManager = new CameraManager(mouseConstraint);

    NodeGenotype.collisionFilter = {
        category: creatureCategory, // put creatures in their own category
        mask: defaultCategory // only allow creatures to collide with the environment and not each other.
    };

    let genomes = [];

    for (let i = 0; i < 3; i++) {
        genomes.push(CreatureGenome.createRandom(3));
    }

    let creatures = [];

    for (const genome of genomes) {
        const creature = new Creature(genome);
        creatures.push(creature);
        World.add(engine.world, creature.getPhenome());
    }

    // Make the 'creature' move to the right... really slowly...
    Events.on(engine, 'beforeUpdate', function (event) {
        cameraManager.onBeforeUpdate(engine, render, mouseConstraint);

        for (const creature of creatures) {
            creature.update(event.timestamp);
        }
    });

    Events.on(engine, 'afterUpdate', function () {
        cameraManager.onAfterUpdate(engine, render, mouseConstraint);
    });

    // run the engine
    Engine.run(engine);

    // run the renderer
    Render.run(render);
}

