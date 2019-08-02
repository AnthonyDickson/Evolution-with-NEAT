import Matter from "matter-js";
import {CameraManager} from "./camera";

export function main() {
    // module aliases
    const Engine = Matter.Engine,
        Render = Matter.Render,
        Constraint = Matter.Constraint,
        Events = Matter.Events,
        MouseConstraint = Matter.MouseConstraint,
        Mouse = Matter.Mouse,
        World = Matter.World,
        Bodies = Matter.Bodies;
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

    const cameraManager = new CameraManager(mouseConstraint);

    const bodyStyle = {fillStyle: '#1a1'}; // green like the Hulk
    const groundStyle = {fillStyle: '#573b0c'}; // earthy brown

    // create two boxes and a ground
    const boxA = Bodies.rectangle(0, 200, 80, 80, {render: bodyStyle});
    const boxB = Bodies.rectangle(0, 50, 80, 80, {render: bodyStyle});
    const ground = Bodies.rectangle(0, 570, worldWidth, 60,
        {isStatic: true, render: groundStyle});

    // add all of the bodies to the world
    World.add(engine.world, [boxA, boxB, ground]);

    const circleA = Bodies.circle(0, 0, 20, {friction: 0.9, inertia: Infinity});
    const circleB = Bodies.circle(80, 0, 20, {friction: 0.9, inertia: Infinity});
    const circleC = Bodies.circle(40, 80, 20, {friction: 0.9, inertia: Infinity});

    const constraintA = Constraint.create({
        bodyA: circleA,
        bodyB: circleB,
        stiffness: 0.04,
        // damping: 0.05,
    });
    const constraintB = Constraint.create({
        bodyA: circleB,
        bodyB: circleC,
        stiffness: 0.04,
        // damping: 0.05,
    });
    const constraintC = Constraint.create({
        bodyA: circleC,
        bodyB: circleA,
        stiffness: 0.04,
        // damping: 0.05,
    });

    World.add(engine.world, [circleA, circleB, circleC, constraintA, constraintB, constraintC]);

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

