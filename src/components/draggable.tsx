import type { ReactNode } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

type Props = {
  children: ReactNode;
  /** Called with the finger's position on screen when she lets go. Return true to accept the drop. */
  onDrop: (x: number, y: number) => boolean;
  onPickUp?: () => void;
  /** Stay where she dropped it, instead of springing back, when the drop isn't accepted. */
  stayWhereDropped?: boolean;
};

/** Something she can pick up and drag. If the drop isn't accepted, it springs back home. */
export function Draggable({ children, onDrop, onPickUp, stayWhereDropped }: Props) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const lifted = useSharedValue(1);
  // Flashes a red outline when a piece is dropped in the wrong place.
  const wrong = useSharedValue(0);

  const release = (absoluteX: number, absoluteY: number) => {
    const accepted = onDrop(absoluteX, absoluteY);
    lifted.value = withTiming(1, { duration: 120 });
    if (!accepted) wrong.value = withSequence(withTiming(1, { duration: 120 }), withTiming(1, { duration: 450 }), withTiming(0, { duration: 250 }));
    if (!accepted && !stayWhereDropped) {
      // Glide straight back, no bounce: the red outline says "not there".
      const back = { duration: 260, easing: Easing.out(Easing.cubic) };
      x.value = withTiming(0, back);
      y.value = withTiming(0, back);
    }
  };
  const pickUp = () => onPickUp?.();

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = x.value;
      startY.value = y.value;
      lifted.value = withTiming(1.1, { duration: 120 });
      scheduleOnRN(pickUp);
    })
    .onUpdate((e) => {
      x.value = startX.value + e.translationX;
      y.value = startY.value + e.translationY;
    })
    .onFinalize((e) => {
      scheduleOnRN(release, e.absoluteX, e.absoluteY);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: lifted.value }],
    zIndex: lifted.value > 1.01 ? 100 : 1,
  }));
  const outline = useAnimatedStyle(() => ({ opacity: wrong.value }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>
        {children}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 18, borderWidth: 5, borderColor: '#F2545B' }, outline]} />
      </Animated.View>
    </GestureDetector>
  );
}
