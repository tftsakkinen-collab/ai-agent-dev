import React from 'react';
import { render } from '@testing-library/react-native';
import ProductList from '../components/ProductList';

jest.mock('../lib/api', () => ({
  getFavorites: jest.fn(() => new Promise(resolve => setTimeout(() => resolve([]), 0))),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
}));

test('renders product list items', () => {
  const products = [{ id: '1', name: 'Test', price: '10€', short: 'desc' }];
  const { getByText } = render(<ProductList products={products} />);
  expect(getByText('Test')).toBeTruthy();
  expect(getByText('10€')).toBeTruthy();
});
