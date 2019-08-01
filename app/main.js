import Matter from "matter-js";

export function main() {
    // module aliases
    const Engine = Matter.Engine,
        Render = Matter.Render,
        World = Matter.World,
        Bodies = Matter.Bodies;
    // create an engine
    const engine = Engine.create();
    // create a renderer
    const render = Render.create({
        element: document.body,
        engine: engine
    });

    // create two boxes and a ground
    const boxA = Bodies.rectangle(400, 200, 80, 80);
    const boxB = Bodies.rectangle(450, 50, 80, 80);
    const ground = Bodies.rectangle(400, 610, 810, 60, {isStatic: true});

    // add all of the bodies to the world
    World.add(engine.world, [boxA, boxB, ground]);

    // add mouse control
    const mouse = Matter.Mouse.create(render.canvas),
        mouseConstraint = Matter.MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
        });

    World.add(engine.world, mouseConstraint);

    // run the engine
    Engine.run(engine);

    // run the renderer
    Render.run(render);
}

