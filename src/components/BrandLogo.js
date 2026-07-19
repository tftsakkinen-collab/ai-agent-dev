import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export default function BrandLogo({ size = 48, showText = true, showTagline = false }) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.iconCircle, { width: size, height: size, borderRadius: size / 2 }]}>        
        <View style={[styles.innerShape, { width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21 }]} />
        <View style={[styles.pinTip, { borderLeftWidth: size * 0.09, borderRightWidth: size * 0.09, borderTopWidth: size * 0.14 }]} />
      </View>
      {showText ? (
        <View style={styles.textWrapper}>
          <Text style={styles.text}>Gearspot</Text>
          {showTagline ? <Text style={styles.tagline}>Vuokkaa lähelläsi</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    backgroundColor: '#15948b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#15948b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5
  },
  innerShape: {
    backgroundColor: '#fff',
    position: 'absolute',
    width: '42%',
    height: '42%',
    borderRadius: 999,
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    position: 'absolute',
    bottom: -8
  },
  textWrapper: {
    justifyContent: 'center'
  },
  text: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f2f3d'
  },
  tagline: {
    fontSize: 12,
    color: '#58717d',
    marginTop: 2
  }
});
