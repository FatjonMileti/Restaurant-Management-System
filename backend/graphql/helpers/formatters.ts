import crypto from 'crypto';
import moment from 'moment';
import { getDB } from '../../config/rxdb.js';

const genId = () => crypto.randomUUID();

const unwrapDoc = (doc: any) => {
  if (doc.toJSON && typeof doc.toJSON === 'function') {
    const json = doc.toJSON();
    if (json !== doc) return json;
  }
  if (doc.toObject) return doc.toObject();
  return doc;
};

export const formatUser = (userDoc: any) => {
  if (!userDoc) return null;
  const d = unwrapDoc(userDoc);
  return {
    id: d._id ? d._id.toString() : d.id || '',
    name: d.name || '',
    email: d.email || '',
    role: d.role || 'customer',
    phone: d.phone || null,
    createdAt: d.createdAt ? moment(d.createdAt).format('YYYY-MM-DD HH:mm:ss') : d.createdAt,
    updatedAt: d.updatedAt ? moment(d.updatedAt).format('YYYY-MM-DD HH:mm:ss') : d.updatedAt,
  };
};

export const formatRestaurantSettings = (doc: any) => {
  if (!doc) return null;
  const d = unwrapDoc(doc);
  return {
    id: d._id ? d._id.toString() : d.id || '',
    name: d.name || '',
    logo: d.logo || '',
    address: d.address || '',
    phone: d.phone || '',
    email: d.email || '',
    tableCount: d.tableCount || 10,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
};

export const getOrCreateRestaurantSettings = async () => {
  const db = await getDB();
  let settings = await db.settings.findOne().exec();
  if (!settings) {
    const doc = await db.settings.insert({
      _id: genId(),
      name: 'Restaurant MS',
      logo: '',
      address: '',
      phone: '',
      email: '',
      tableCount: 10,
    });
    return doc.toJSON();
  }
  return settings.toJSON();
};

export const formatOrder = async (o: any, menuItemMap?: Map<string, any>) => {
  const db = await getDB();
  // Prefer an already-populated user object (see order resolvers using
  // doc.populate('user')); fall back to a lookup when only the id is present.
  const user =
    o.user && typeof o.user === 'object' ? o.user : await db.users.findOne(o.user).exec();
  const userObj = formatUser(user);
  const itemsArr = (o.items || []).map((item: any) => {
    let menuItemObj: any = null;
    if (item.menuItem && typeof item.menuItem === 'object' && item.menuItem._id) {
      menuItemObj = {
        id: item.menuItem._id.toString(),
        name: item.menuItem.name,
        description: item.menuItem.description,
        price: item.menuItem.price,
        category: item.menuItem.category,
        image: item.menuItem.image,
        available: item.menuItem.available ?? true,
      };
    } else if (typeof item.menuItem === 'string' && menuItemMap) {
      const found = menuItemMap.get(item.menuItem);
      if (found) {
        menuItemObj = {
          id: found._id,
          name: found.name,
          description: found.description,
          price: found.price,
          category: found.category,
          image: found.image,
          available: found.available ?? true,
        };
      }
    }
    return {
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      menuItem: menuItemObj,
    };
  });
  const orderAny: any = o;
  return {
    id: orderAny._id ? orderAny._id.toString() : orderAny.id || null,
    user: userObj,
    items: itemsArr,
    totalAmount: orderAny.totalAmount,
    status: orderAny.status,
    tableNumber: orderAny.tableNumber,
    paymentMethod: orderAny.paymentMethod,
    createdAt: orderAny.createdAt,
    updatedAt: orderAny.updatedAt,
  };
};

export const formatReservation = async (doc: any) => {
  const d = unwrapDoc(doc);
  // Accept an already-populated user object; otherwise resolve the stored user id.
  // (Previously a raw id string was passed straight to formatUser, which always
  // produced an empty user object.)
  let userDoc: any = null;
  if (d.user && typeof d.user === 'object') {
    userDoc = d.user;
  } else if (d.user) {
    const db = await getDB();
    userDoc = await db.users.findOne(d.user).exec();
  }
  const userObj = formatUser(userDoc);
  return {
    ...d,
    id: d._id ? d._id.toString() : d.id || null,
    user: userObj,
    status: d.status || 'confirmed',
    date: d.date ? moment(d.date).format('YYYY-MM-DD') : d.date,
  };
};

export const formatMenuItem = (doc: any) => {
  if (!doc) return null;
  const d = unwrapDoc(doc);
  return {
    ...d,
    id: d._id ? d._id.toString() : d.id || '',
    available: d.available ?? true,
  };
};

export const formatCategory = (doc: any) => {
  if (!doc) return null;
  const d = unwrapDoc(doc);
  return {
    ...d,
    id: d._id ? d._id.toString() : d.id || '',
  };
};
