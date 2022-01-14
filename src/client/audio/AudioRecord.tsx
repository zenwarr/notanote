import { useEffect, useRef, useState } from "react";
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


  stop() {
    this.recorder?.stop();
  }


  pause() {
    this.recorder?.pause();
  }


  get state(): string {
    return this.recorder?.state || "inactive";
  }


  getAudioUrl() {
    return URL.createObjectURL(new Blob(this.chunks, {
      type: "audio/ogg; codecs=opus"
    }));
  }


  protected recorder?: MediaRecorder;
  chunks: Blob[] = [];
}


export const AudioRecord = observer(() => {
  const recorderRef = useRef<AudioRecorder | undefined>(new AudioRecorder());
  const [ ready, setReady ] = useState(false);

  useEffect(() => {
    recorderRef.current?.init();

    return () => {
      recorderRef.current?.stop();
      recorderRef.current = undefined;
    };
  }, []);

  function onStop() {
    recorderRef.current?.stop();
    setReady(true);
  }

  function onStart() {
    recorderRef.current?.start();
    setReady(false);
  }

  const recorder = recorderRef.current;
  if (!recorder) {
    return <></>;
  }

  return <div>
    { recorder.state }

    { recorder.chunks.length }

    <button onClick={ onStart }>
      Record
    </button>

    <button onClick={ onStop }>
      Stop
    </button>

    {
      ready && <div>
        <audio src={ recorder.getAudioUrl() } controls/>
      </div>
    }
  </div>;
});
