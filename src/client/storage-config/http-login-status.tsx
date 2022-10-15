import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Button, TextField, Stack, CircularProgress } from "@mui/material";
import ky from "ky";
import { httpRequest } from "../utils/http-request";


export type HttpLoginStatusProps = {
  server: string;
}


export function HttpLoginStatus(props: HttpLoginStatusProps) {
  const [ userName, setUserName ] = useState<string | undefined>();
  const [ password, setPassword ] = useState<string | undefined>();
  const [ userInfo, setUserInfo ] = useState<UserInfo | undefined>();
  const [ userInfoLoading, setUserInfoLoading ] = useState(true);
  const [ userInfoError, setUserInfoError ] = useState<string | undefined>();

  const currentRequest = useRef<string | undefined>();

  useEffect(() => {
    currentRequest.current = props.server;

    setTimeout(() => {
      function isActual() {
        return currentRequest.current === props.server;
      }

      if (!isActual()) return;

      setUserInfoLoading(true);
      setUserInfoError(undefined);
      requestUserProfile(props.server).then(d => {
        if (!isActual()) return;
        setUserInfo(d);
        setUserInfoError(undefined);
        setUserInfoLoading(false);
      }, err => {
        if (!isActual()) return;
        setUserInfoError(err.message);
        setUserInfoLoading(false);
      });
    }, 400);
  }, [ props.server ]);

  function onUserNameChange(e: ChangeEvent<HTMLInputElement>) {
    setUserName(e.target.value);
  }

  function onPasswordChange(e: ChangeEvent<HTMLInputElement>) {
    setPassword(e.target.value);
  }

  async function logOut() {
    await requestLogOut(props.server);
    setUserInfoError(undefined);
    setUserInfoLoading(false);
    setUserInfo(undefined);
    setUserName(undefined);
    setPassword(undefined);
  }

  async function logIn(e: React.FormEvent) {
    e.preventDefault();

    if (!userName || !password) {
      alert("User name and password should not be empty")
      return;
    }

    const d = await requestLogIn(props.server, userName, password);
    if (d) {
      setUserInfoError(undefined);
      setUserInfoLoading(false);
      setUserInfo(d);
      setUserName(undefined);
      setPassword(undefined);
    }
  }

  return <>
    {
        userInfoLoading && <CircularProgress/>
    }

    {
        userInfoError && <span>{ userInfoError }</span>
    }

    {
        !userInfoLoading && !userInfoError && <Stack direction={ "row" } spacing={ 1 }>
          {
            userInfo ? <Stack direction={ "row" } spacing={ 2 } alignItems={ "center" }>
              <span>Logged in as { userInfo.name }</span>
              <Button onClick={ logOut } variant={ "outlined" } size={ "small" }>Log out</Button>
            </Stack> : <form onSubmit={ logIn }>
              <Stack direction={ "row" } spacing={ 2 } alignItems={ "center" }>
                <span>Not logged in</span>
                <TextField label={ "User name" } value={ userName } onChange={ onUserNameChange }/>
                <TextField label={ "Password" } value={ password } onChange={ onPasswordChange } type={ "password" }/>
                <Button type={ "submit" } variant={ "outlined" } size={ "small" }>Log in</Button>
              </Stack>
            </form>
          }
      </Stack>
    }
  </>;
}


interface UserInfo {
  name: string;
}


export const requestUserProfile = async (server: string): Promise<UserInfo | undefined> => {
  let url = new URL(server);
  if (url.pathname !== "/") {
    throw new Error("Invalid server URL: " + server);
  }

  const r = await ky.get("api/profile", {
    prefixUrl: server,
    credentials: "include",
    throwHttpErrors: false
  });
  if (r.status === 401) {
    return undefined;
  } else if (r.status === 200) {
    return r.json();
  } else {
    throw new Error("Unexpected reply status: " + r.statusText);
  }
};


async function requestLogOut(server: string) {
  await ky.post("auth/logout", {
    prefixUrl: server,
    credentials: "include"
  });
}


async function requestLogIn(server: string, name: string, password: string): Promise<UserInfo | undefined> {
  try {
    const r = await httpRequest("auth/login", {
      prefixUrl: server,
      credentials: "include",
      json: { name, password }
    });

    const d = await r.json() as any;
    return {
      name: d.name
    };
  } catch (err: any) {
    alert(err.message);
    return undefined;
  }
}
