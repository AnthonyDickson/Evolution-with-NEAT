/** Messages that are passed between the main thread and the worker thread. */

/** Message indicating the genetic algorithm and physics engine should be started. */
export const START = 0x0001;
/** Message indicating the program is quitting (i.e. the user closed the browser window containing the app. */
export const QUIT = 0x0002;
/** Message representing a request for the current population. */
export const GET_POPULATION = 0x0003;
/**
 * Message representing a request for the current progress of the current generation (generation number and current
 * fitness for each creature.
 */
export const GET_PROGRESS = 0x0004;
/** Message indicating a new generation was started in the genetic algorithm. */
export const STARTED_GENERATION = 0x0005;
/** Message indicating a new generation was just finished in the genetic algorithm. */
export const FINISHED_GENERATION = 0x0006;