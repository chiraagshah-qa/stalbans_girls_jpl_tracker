/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/standings` | `/standings`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/favourites` | `/favourites`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/results` | `/results`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/standings` | `/standings`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/favourites` | `/favourites`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/results` | `/results`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}${`?${string}` | `#${string}` | ''}` | `/${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/standings${`?${string}` | `#${string}` | ''}` | `/standings${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/favourites${`?${string}` | `#${string}` | ''}` | `/favourites${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/results${`?${string}` | `#${string}` | ''}` | `/results${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/standings` | `/standings`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/favourites` | `/favourites`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/results` | `/results`; params?: Router.UnknownInputParams; };
    }
  }
}
