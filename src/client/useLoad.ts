import { useEffect, useState } from "react";


export type LoadState<T> = {
  isLoaded: false;
  loading: boolean;
  loadError: Error | undefined;
  data: undefined | T;
} | {
  isLoaded: true;
  loading: false;
  loadError: undefined;
  data: T;
};


export type UseLoadErrorHandler = (error: Error) => void;


export interface UseLoadOptions {
  onError?: UseLoadErrorHandler;
  dropOldData?: boolean;
}


/**
 * Позволяет загружать данные с помощью указанного коллбека.
 * Возвращает объект, описывающий загруженные данные и состояние их загрузки.
 * Если `onError` не передан, автоматически показывает сообщение об ошибке.
 * Не показывает сообщение и не вызывает `onError`, если компонент к моменту окончания загрузки уже закончил свой жизненный цикл.
 * Загрузка происходит заново каждый раз, когда изменяется функция `load`.
 * Как только загрузка начинается, загруженные ранее данные очищаются.
 * Чтобы изменить это поведение, можно использовать флаг `options.dropOldData`: в таком случае данные не очищаются до тех пор, пока не будут успешно загружены новые данные.
 */
export function useLoad<T>(load: () => Promise<T>, onErrorOrOptions?: UseLoadOptions | UseLoadErrorHandler): LoadState<T> {
  const [ state, setState ] = useState<LoadState<T>>({
    isLoaded: false,
    loading: false,
    loadError: undefined,
    data: undefined
  });

  let stillActive = true;
  let onError: UseLoadErrorHandler | undefined;
  let dropOldData = true;

  if (typeof onErrorOrOptions === "function") {
    onError = onErrorOrOptions;
  } else if (onErrorOrOptions) {
    onError = onErrorOrOptions.onError;
    dropOldData = onErrorOrOptions.dropOldData ?? true;
  }

  useEffect(() => {
    setState(prev => ({
      loading: true,
      loadError: undefined,
      data: dropOldData ? undefined : prev.data,
      isLoaded: false
    }));

    load().then(data => {
      if (stillActive) {
        setState({
          loading: false,
          loadError: undefined,
          data: data,
          isLoaded: true
        });
      }
    }, error => {
      if (stillActive) {
        setState(prev => ({
          loading: false,
          loadError: error,
          data: dropOldData ? undefined : prev.data,
          isLoaded: false
        }));

        if (onError) {
          onError(error);
        } else {
          console.error(error);

          const loadErrorText: string = error.message || "Unknown error";
          alert(`Failed to load: ${ loadErrorText }`);
        }
      }
    });

    return () => {
      stillActive = false;
    };
  }, [ load ]);

  return state;
}
