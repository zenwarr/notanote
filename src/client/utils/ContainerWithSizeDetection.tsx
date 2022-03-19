import * as React from "react";
import { useLayoutEffect, useState } from "react";
import elementResizeDetectorMaker from "element-resize-detector";


export function ContainerWithSizeDetection(props: { className?: string, children: (width: number, height: number) => React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [ trigger, setTrigger ] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }

    const elementResizeDetector = elementResizeDetectorMaker({
      strategy: "scroll",
    });

    elementResizeDetector.listenTo(ref.current, () => {
      setTrigger(trigger + 1);
    });

    return () => {
      if (ref.current) {
        elementResizeDetector.removeAllListeners(ref.current);
      }
    };
  }, []);

  let width = 0, height = 0;
  if (ref.current) {
    const style = getComputedStyle(ref.current);
    width = ref.current.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    height = ref.current.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  }

  return <div ref={ ref } className={ props.className }>
    {
      props.children(width, height)
    }
  </div>;
}
