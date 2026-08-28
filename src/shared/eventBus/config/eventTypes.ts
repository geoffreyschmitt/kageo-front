export type AppEvents = UIEvents & UserEvents & WishlistEvents & WishEvents;

type UIEvents = {
  'ui:themeChanged': 'light' | 'dark';
  'ui:languageChanged': 'en' | 'fr';
  'ui:toast': { message: string; type?: 'success' | 'error' | 'info' | 'warning'; duration?: number };
};


type UserEvents = {
  'auth:openLoginModal': {};
};

type WishlistEvents = {
  'wishlist:openCreationModal': {};
  'wishlist:closeCreationModal': {};
  'wishlist:create': {};

  'wishlist:openUpdateModal': {
    id?: string
    name?: string
    description?: string
    coverImage?: string
    eventDate?: Date | string
    isPublic?: boolean
    itemCount?: number
    ownerId?: string
    ownerName?: string
    createdAt?: Date
  };
  'wishlist:closeUpdateModal': {};

  'wishlist:update': {};
  
  'wishlist:delete': {};
};


type WishEvents = {
  // Fired from a WishCard to open the shared comments drawer for that wish.
  'wish:openComments': { wishId: string; wishName: string };
  // Fired from the comments drawer after a comment is posted, so open cards
  // can keep their comment counter in sync without a reload.
  'wish:commentCountChanged': { wishId: string; delta: number };
};


export type EventName = keyof AppEvents;
export type EventPayload<T extends EventName> = AppEvents[T];
export type Listener<T extends EventName> = (payload: EventPayload<T>) => void;