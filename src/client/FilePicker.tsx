import { useEffect, useState } from "react"

let togglePicker: (() => void) | undefined = undefined;

export function FilePickerProvider(props: React.PropsWithChildren<{}>) {
    const [ open, setOpen ] = useState(false);

    useEffect(() => {
        togglePicker = () => {
            setOpen(!open);
        };

        return () => {
            togglePicker = undefined;
        }
    }, [ open ]);

    return <div>
        {
            open ? "file picker open" : undefined
        }

        {
            props.children
        }
    </div>
}


export function toggleFilePicker() {
    togglePicker?.();
}