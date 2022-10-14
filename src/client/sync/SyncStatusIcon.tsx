import SyncIcon from "@mui/icons-material/Sync";


export type SyncStatusIconProps = {
  color: SyncStatusIconColor;
  rotate?: boolean;
}


export type SyncStatusIconColor = "success" | "error";


export function SyncStatusIcon(props: SyncStatusIconProps) {
  const styles = {
    // opacity: 0.6,
    ...(props.rotate ? {
      animation: "spin 4s linear infinite",
      "@keyframes spin": {
        "0%": {
          transform: "rotate(360deg)",
        },
        "100%": {
          transform: "rotate(0deg)",
        },
      }
    } : undefined)
  };

  return <SyncIcon color={ props.color === "success" ? undefined : props.color } sx={ styles }/>;
}
