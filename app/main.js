import Matter from "matter-js";
import {CameraManager} from "./camera";

export function main() {
    // module aliases
    const Engine = Matter.Engine,
        Render = Matter.Render,
        Events = Matter.Events,
        MouseConstraint = Matter.MouseConstraint,
        Mouse = Matter.Mouse,
        World = Matter.World,
        Bodies = Matter.Bodies;
    // create an engine
    const engine = Engine.create();
    // create a renderer
    const render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: 800,
            height: 600,
            hasBounds: true,
            showAngleIndicator: true
        }
    });

    // create two boxes and a ground
    const boxA = Bodies.rectangle(400, 200, 80, 80);
    const boxB = Bodies.rectangle(450, 50, 80, 80);
    const ground = Bodies.rectangle(400, 610, 810, 60, {isStatic: true});

    // add all of the bodies to the world
    World.add(engine.world, [boxA, boxB, ground]);

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

    engine.world.bounds.min.x = -300;
    engine.world.bounds.min.y = -300;
    engine.world.bounds.max.x = 1100;
    engine.world.bounds.max.y = 900;

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

