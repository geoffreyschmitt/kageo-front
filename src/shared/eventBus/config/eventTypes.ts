export type AppEvents = UIEvents & UserEvents & WishlistEvents & WishEvents;

type UIEvents = {
  'ui:themeChanged': 'light' | 'dark';
  'ui:languageChanged': 'en' | 'fr';
};


type UserEvents = {};

type WishlistEvents = {
  'wishlist:openCreationModal': {};
  'wishlist:closeCreationModal': {};
  'wishlist:create': {};

  'wishlist:openUpdateModal': {};
  'wishlist:closeUpdateModal': {};

  'wishlist:update': {};
  
  'wishlist:delete': {};
};


type WishEvents = {};


export type EventName = keyof AppEvents;
export type EventPayload<T extends EventName> = AppEvents[T];
export type Listener<T extends EventName> = (payload: EventPayload<T>) => void;