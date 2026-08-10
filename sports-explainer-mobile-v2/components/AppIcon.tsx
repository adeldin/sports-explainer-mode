import { Image, Text, StyleProp, TextStyle, ImageStyle } from 'react-native';
import { iconFor } from '../lib/iconAssets';

/**
 * Renders an icon as custom artwork when we have it, and as the plain emoji when we don't.
 *
 * A drop-in replacement for the `<Text style={styles.somethingEmoji}>{emoji}</Text>` pattern this
 * app used everywhere. Call sites keep passing the same emoji string they already had, so adopting
 * this is additive: nothing about the icon DATA changes, only who draws it.
 *
 * `size` is required because an emoji sizes itself from fontSize while an Image needs explicit
 * width/height. Passing the same number the old fontSize used keeps layout identical, which is what
 * makes the swap — and the revert — visually neutral.
 */
export default function AppIcon({
  emoji, size, style, imageStyle,
}: {
  emoji: string;
  size: number;
  /** The original Text style, used verbatim on the emoji fallback so nothing shifts. */
  style?: StyleProp<TextStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}) {
  const art = iconFor(emoji);
  if (!art) return <Text style={style}>{emoji}</Text>;
  return (
    <Image
      source={art}
      style={[{ width: size, height: size }, imageStyle]}
      // contain, never cover: the art is drawn with its own margin and cropping it would clip
      // outlines. A square box with letterboxing is correct here.
      resizeMode="contain"
      accessible={false}
    />
  );
}
