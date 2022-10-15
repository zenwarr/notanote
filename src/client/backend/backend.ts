export type BackendClass<T> = new () => T;


/**
 * Абстракция, которая позволяет подменять классы для выборки данных с сервера на тестовые реализации.
 */
export abstract class Backend {
  private static _backends = new Map<BackendClass<any>, BackendClass<any>>();
  private static _cache = new Map<BackendClass<any>, any>();


  public static clear() {
    this._backends.clear();
    this._cache.clear();
  }


  /**
   * Регистрирует переопределение класса.
   * Теперь, если функция `get` вызывается с классом `key`, то будет возвращаться объект класса `cl`.
   */
  public static register<T>(key: BackendClass<T>, cl: BackendClass<T>) {
    this._backends.set(key, cl);
  }


  /**
   * Возвращает объект, созданный из класса `cl` или, если есть переопределение, на основе переопределенного класса.
   */
  public static get<T>(cl: BackendClass<T>): T {
    if (!this._cache.has(cl)) {
      const realClass = this._backends.get(cl) || cl;
      this._cache.set(cl, new realClass());
    }

    return this._cache.get(cl) as T;
  }
}
