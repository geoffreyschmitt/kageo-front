// Events that carry no data.
type NoPayload = Record<string, never>;

export type AppEvents = UIEvents & UserEvents & WishlistEvents & WishEvents;

type UIEvents = {
  'ui:themeChanged': 'light' | 'dark';
  'ui:languageChanged': 'en' | 'fr';
  'ui:rateLimited': NoPayload;
  'ui:notInvited': NoPayload;
  'ui:toast': { message: string; type?: 'success' | 'error' | 'info' | 'warning'; duration?: number };
};


type UserEvents = {
  'auth:openLoginModal': NoPayload;
};

type WishlistEvents = {
  'wishlist:openCreationModal': NoPayload;
  'wishlist:closeCreationModal': NoPayload;
  'wishlist:create': NoPayload;

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
  'wishlist:closeUpdateModal': NoPayload;

  'wishlist:update': NoPayload;
  
  'wishlist:delete': NoPayload;

  // Fired from the wishlist sidebar preview to open the comments drawer on the wishlist thread.
  'wishlist:openComments': { wishlistId: string };
  // Fired from the drawer after a wishlist comment is posted, so the sidebar preview can refresh.
  'wishlist:commentPosted': { wishlistId: string };
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