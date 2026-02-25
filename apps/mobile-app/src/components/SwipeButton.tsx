import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface SwipeButtonProps {
  onSwipeSuccess: () => void;
  title?: string;
}

const BUTTON_WIDTH = 300;
const BUTTON_HEIGHT = 60;
const SWIPE_THRESHOLD = BUTTON_WIDTH * 0.7;

export const SwipeButton: React.FC<SwipeButtonProps> = ({ onSwipeSuccess, title = "Swipe to Upload" }) => {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newValue = startX.value + event.translationX;
      if (newValue >= 0 && newValue <= BUTTON_WIDTH - BUTTON_HEIGHT) {
        translateX.value = newValue;
      }
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withSpring(BUTTON_WIDTH - BUTTON_HEIGHT);
        runOnJS(onSwipeSuccess)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedTrackStyle = useAnimatedStyle(() => {
    return {
      width: translateX.value + BUTTON_HEIGHT,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.track, animatedTrackStyle]} />
      <Text style={styles.title}>{title}</Text>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.thumb, animatedStyle]}>
          <Text style={styles.arrow}>{'>>'}</Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    backgroundColor: '#001F3F',
    borderRadius: BUTTON_HEIGHT / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    height: BUTTON_HEIGHT,
    backgroundColor: '#34C759',
    borderRadius: BUTTON_HEIGHT / 2,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    position: 'absolute',
    zIndex: 1,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: BUTTON_HEIGHT,
    height: BUTTON_HEIGHT,
    backgroundColor: '#FFF',
    borderRadius: BUTTON_HEIGHT / 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  arrow: {
    color: '#001F3F',
    fontWeight: 'bold',
    fontSize: 18,
  }
});
