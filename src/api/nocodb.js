import api from './api';
import {
  NOCODB_ORDERS_TABLE_NAME,
  NOCODB_ORDERS_VIEW_ID,
  NOCODB_SCANNING_TABLE_NAME,
  NOCODB_SCANNING_VIEW_ID,
} from '../constants/index.js';

export const getOrders = async (order_id) => {
  const response = await api.get(`/tables/${NOCODB_ORDERS_TABLE_NAME}/records`, {
    params: {
      offset: 0,
      limit: 25,
      where: `(order_id,eq,${order_id})`,
      viewId: NOCODB_ORDERS_VIEW_ID,
    },
  });

  return response.data;
};

// Second Table
export const getTailors = async (order_id) => {
  const response = await api.get(`/tables/${NOCODB_SCANNING_TABLE_NAME}/records`, {
    params: {
      offset: 0,
      limit: 25,
      where: `(order_id,eq,${order_id})`,
      viewId: NOCODB_SCANNING_VIEW_ID,
    },
  });

  return response.data;
};
