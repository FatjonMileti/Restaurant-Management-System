import moment from 'moment';
import RestaurantSettings from '../../models/RestaurantSettings.js';

export const formatUser = (userDoc: any) => {
  if (!userDoc) return null;
  const d = userDoc.toObject ? userDoc.toObject() : userDoc;
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
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id ? d._id.toString() : d.id || '',
    name: d.name,
    logo: d.logo || '',
    address: d.address || '',
    phone: d.phone || '',
    email: d.email || '',
    tableCount: d.tableCount,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
};

export const getOrCreateRestaurantSettings = async () => {
  let settings = await RestaurantSettings.findOne();
  if (!settings) {
    settings = await RestaurantSettings.create({
      name: 'Restaurant MS',
      logo: '',
      address: '',
      phone: '',
      email: '',
      tableCount: 10,
    });
  }
  return settings;
};

export const formatOrder = (o: any) => {
  const userObj = formatUser(o.user);
  const itemsArr = (o.items || []).map((item: any) => {
    const menuItemObj: any = item.menuItem
      ? {
          id: item.menuItem._id ? item.menuItem._id.toString() : item.menuItem.id || null,
          name: item.menuItem.name,
          description: item.menuItem.description,
          price: item.menuItem.price,
          category: item.menuItem.category,
          image: item.menuItem.image,
          available: item.menuItem.available,
          createdAt: item.menuItem.createdAt,
          updatedAt: item.menuItem.updatedAt,
        }
      : null;
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

export const formatReservation = (doc: any) => {
  const d = doc.toObject ? doc.toObject() : doc;
  const userObj = formatUser(d.user);
  return {
    ...d,
    id: d._id ? d._id.toString() : d.id || null,
    user: userObj,
    date: d.date ? moment(d.date).format('YYYY-MM-DD') : d.date,
  };
};

export const formatMenuItem = (doc: any) => {
  if (!doc) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    ...d,
    id: d._id ? d._id.toString() : d.id || '',
  };
};

export const formatCategory = (doc: any) => {
  if (!doc) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    ...d,
    id: d._id ? d._id.toString() : d.id || '',
  };
};
