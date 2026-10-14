import type { ReactNode } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
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

  const release = (absoluteX: number, absoluteY: number) => {
    const accepted = onDrop(absoluteX, absoluteY);
    lifted.value = withSpring(1);
    if (!accepted && !stayWhereDropped) {
      x.value = withSpring(0, { damping: 14 });
      y.value = withSpring(0, { damping: 14 });
    }
  };
  const pickUp = () => onPickUp?.();

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = x.value;
      startY.value = y.value;
      lifted.value = withSpring(1.15);
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

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
