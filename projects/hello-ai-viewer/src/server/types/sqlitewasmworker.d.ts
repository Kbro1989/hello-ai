declare module './sqlitewasmworker.ts' {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}