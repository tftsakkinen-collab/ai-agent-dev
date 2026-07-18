import React from 'react';
import { render } from '@testing-library/react-native';
import ProductList from '../components/ProductList';

test('renders product list items', () => {
  const products = [{ id: '1', name: 'Test', price: '10€', short: 'desc' }];
  const { getByText } = render(<ProductList products={products} />);
  expect(getByText('Test')).toBeTruthy();
  expect(getByText('10€')).toBeTruthy();
});
