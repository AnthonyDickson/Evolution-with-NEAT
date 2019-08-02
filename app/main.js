import {Bodies, Engine, Events, Mouse, MouseConstraint, Render, World} from "matter-js";
import {MuscleConstraint} from "./muscle";


import {CameraManager} from "./camera";

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

    const groundStyle = {fillStyle: '#573b0c'}; // earthy brown

    // create two boxes and a ground
    const ground = Bodies.rectangle(0, 570, worldWidth, 60,
        {isStatic: true, render: groundStyle});

    // add all of the bodies to the world
    World.add(engine.world, ground);

    // Create... something
    const circleA = Bodies.circle(0, 550, 20, {friction: 0.1, inertia: Infinity});
    const circleB = Bodies.circle(80, 550, 20, {friction: 0.9, inertia: Infinity});
    const circleC = Bodies.circle(80, 470, 20, {friction: 0.9, inertia: Infinity});

    const constraintA = MuscleConstraint.create({
        bodyA: circleA,
        bodyB: circleB,
        contractedLength: 60,
        extendedLength: 80,
        stiffness: 0.03,
        damping: 0.1,
    });
    const constraintB = MuscleConstraint.create({
        bodyA: circleB,
        bodyB: circleC,
        contractedLength: 60,
        extendedLength: 80,
        stiffness: 0.03,
        damping: 0.1,
    });
    const constraintC = MuscleConstraint.create({
        bodyA: circleC,
        bodyB: circleA,
        contractedLength: 60,
        extendedLength: 80,
        stiffness: 0.1,
    });

    World.add(engine.world, [circleA, circleB, circleC, constraintA, constraintB, constraintC]);

    let counter = 0;
    MuscleConstraint.contract(constraintC);

    // Make the 'creature' move to the right... really slowly...
    Events.on(engine, 'beforeUpdate', () => {
        counter += 1;

        if (counter === 40) {
            MuscleConstraint.contract(constraintC);
        }
        if (counter >= 60) {
            MuscleConstraint.contract(constraintA);

            counter = 0;
        }
    });

    const cameraManager = new CameraManager(mouseConstraint);

    // use the engine tick event to control our view
    Events.on(engine, 'beforeTick', function () {
        cameraManager.beforeTickUpdate(engine, render, mouseConstraint);
    });

    Events.on(engine, 'afterTick', function () {
        cameraManager.afterTickUpdate(engine, render, mouseConstraint);
    });

    // run the engine
    Engine.run(engine);

    // run the renderer
    Render.run(render);
}

