import {Bounds, Events, Mouse, Vector} from "matter-js";

/** This class manages the camera view in response to mouse input including zooming and panning. */
export class CameraManager {
    /**
     * Create a new camera manager.
     * @param mouseConstraint The mouse constraint being used.
     * @param zoomSpeed How fast to zoom in relation to the speed the scroll wheel is being spun.
     * @param zoomSmoothingRate How much smoothing should be applied to the zooming action. This should be a value in
     *                          the range [0, 1). Setting this to zero results in very twitchy zooming; as this values
     *                          approaches one zooming is interpolated more and becomes a bit more delayed.
     * @param panSpeed How fast to pan in relation to the velocity of the mouse.
     * @param panVelocityDecayRate  How much of the camera velocity should be carried over from the previous frame.
     *                              This should be a value in the range (0, 1]. As the value approaches zero the camera
     *                              maintains more of its velocity and takes longer to come to a stop; setting this
     *                              value to one causes the camera to stop as soon as the mouse button is released.
     */
    constructor(mouseConstraint, zoomSpeed = 0.1, zoomSmoothingRate = 0.8, panSpeed = 0.5, panVelocityDecayRate = 0.95) {
        this.zoomSpeed = zoomSpeed;
        this.zoomSmoothingRate = Math.max(0, 1 - zoomSmoothingRate);

        this.panVelocity = {x: 0, y: 0};
        this.panVelocityDecayRate = Math.max(0, Math.min(panVelocityDecayRate, 1));
        this.panSpeed = panSpeed;

        // TODO: Refactor mouse related stuff so that the mouse instance isn't mutated (want to avoid side effects).
        mouseConstraint.mouse.prevPos = {x: 0, y: 0};

        // keep track of current bounds scale (view zoom)
        this.boundsScaleTarget = 1;
        this.boundsScale = {x: 1, y: 1};
        this.isDraggingBody = false;

        // Set up events to keep track of the mouse state.
        Events.on(mouseConstraint, 'mousedown', function (event) {
            // TODO: Refactor mouse related stuff so that the mouse instance isn't mutated (want to avoid side effects).
            event.mouse.isDown = true;
            event.mouse.prevPos.x = event.mouse.absolute.x;
            event.mouse.prevPos.y = event.mouse.absolute.y;
        });

        Events.on(mouseConstraint, 'mouseup', function (event) {
            // TODO: Refactor mouse related stuff so that the mouse instance isn't mutated (want to avoid side effects).
            event.mouse.isDown = false;
        });


        Events.on(mouseConstraint, 'startdrag', () => this.isDraggingBody = true);
        Events.on(mouseConstraint, 'enddrag', () => this.isDraggingBody = false);
    }

    /**
     * Perform the pre-tick updates for the camera manager.
     *
     * @param engine The engine that is being used.
     * @param render The renderer that is being used.
     * @param mouseConstraint The mouse constraint that is being used.
     */
    beforeTickUpdate(engine, render, mouseConstraint) {
        let world = engine.world,
            mouse = mouseConstraint.mouse;

        this.updateZoom(mouse, render);
        this.updatePan(mouse, render, world);
    }

    /**
     * Update the zoom of the camera view.
     *
     * @param mouse The mouse object.
     * @param render The renderer object.
     */
    updateZoom(mouse, render) {
        // mouse wheel controls zoom
        let scaleFactor = mouse.wheelDelta * -this.zoomSpeed;
        if (scaleFactor !== 0) {
            if ((scaleFactor < 0 && this.boundsScale.x >= 0.6) || (scaleFactor > 0 && this.boundsScale.x <= 1.4)) {
                this.boundsScaleTarget += scaleFactor;
            }
        }

        // if scale has changed
        if (Math.abs(this.boundsScale.x - this.boundsScaleTarget) > 0.01) {
            // smoothly tween scale factor
            scaleFactor = (this.boundsScaleTarget - this.boundsScale.x) * this.zoomSmoothingRate;
            this.boundsScale.x += scaleFactor;
            this.boundsScale.y += scaleFactor;

            // scale the render bounds
            render.bounds.max.x = render.bounds.min.x + render.options.width * this.boundsScale.x;
            render.bounds.max.y = render.bounds.min.y + render.options.height * this.boundsScale.y;

            // translate so zoom is from centre of view
            const translation = {
                x: render.options.width * scaleFactor * -0.5,
                y: render.options.height * scaleFactor * -0.5
            };

            Bounds.translate(render.bounds, translation);

            // update mouse
            Mouse.setScale(mouse, this.boundsScale);
            Mouse.setOffset(mouse, render.bounds.min);
        }
    }

    /**
     * Update the pan of the camera.
     *
     * @param mouse The mouse object.
     * @param render The renderer being used.
     * @param world The world object.
     */
    updatePan(mouse, render, world) {
        let translation = {x: 0, y: 0};

        if (mouse.isDown === true && !this.isDraggingBody) {
            // get vector from mouse relative to its previous position
            const deltaPos = Vector.sub(mouse.prevPos, mouse.absolute),
                direction = Vector.normalise(deltaPos),
                speed = Vector.magnitude(deltaPos) * this.panSpeed;

            translation = Vector.mult(direction, speed);

            this.panVelocity = translation;
        } else {
            this.panVelocity = Vector.mult(this.panVelocity, this.panVelocityDecayRate);
            translation = this.panVelocity;
        }

        if (Vector.magnitude(translation) > 0.01) {
            // prevent the view moving outside the world bounds
            if (render.bounds.min.x + translation.x < world.bounds.min.x)
                translation.x = world.bounds.min.x - render.bounds.min.x;

            if (render.bounds.max.x + translation.x > world.bounds.max.x)
                translation.x = world.bounds.max.x - render.bounds.max.x;

            if (render.bounds.min.y + translation.y < world.bounds.min.y)
                translation.y = world.bounds.min.y - render.bounds.min.y;

            if (render.bounds.max.y + translation.y > world.bounds.max.y)
                translation.y = world.bounds.max.y - render.bounds.max.y;

            // move the view
            Bounds.translate(render.bounds, translation);

            // we must update the mouse too
            Mouse.setOffset(mouse, render.bounds.min);
        }
    }

    // noinspection JSMethodCanBeStatic
    /**
     * Perform the post-tick updates for the camera manager.
     *
     * @param engine The engine that is being used.
     * @param render The renderer that is being used.
     * @param mouseConstraint The mouse constraint that is being used.
     */
    afterTickUpdate(engine, render, mouseConstraint) {
        mouseConstraint.mouse.prevPos.x = mouseConstraint.mouse.absolute.x;
        mouseConstraint.mouse.prevPos.y = mouseConstraint.mouse.absolute.y;
    }
}