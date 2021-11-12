import { useEffect, useRef } from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react-lite";


class AudioRecorder {
  constructor() {
    mobx.makeAutoObservable(this);
  }


  async init() {
    if (!navigator.mediaDevices) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.recorder = new MediaRecorder(stream);
    this.recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };
  }


  start() {
    this.chunks = [];
    this.recorder?.start(10);
  }


  pause() {
    this.recorder?.pause();
  }


  resume() {
    this.recorder?.resume();
  }


  get state(): string {
    return this.recorder?.state || "inactive";
  }


  protected recorder?: MediaRecorder;
  chunks: Blob[] = [];
}


export const AudioRecord = observer(() => {
  const recorderRef = useRef<AudioRecorder>(new AudioRecorder());

  useEffect(() => {
    recorderRef.current.init();
  }, []);

  return <div>
    { recorderRef.current.state }

    { recorderRef.current.chunks.length }

    <button onClick={ () => recorderRef.current.start() }>
      Record
    </button>
  </div>;
});
