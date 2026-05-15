import { AlertCircle, Check, Info, X } from 'lucide-react-native';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  Platform,
  TouchableOpacity,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ScaledText';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
  index: number;
}

import { getContentWidth } from '@/lib/contentWidth';
const screenWidth = getContentWidth();
const TOAST_HEIGHT = 56;
const TOAST_MARGIN = 8;
const TOAST_WIDTH = screenWidth - 32;

const SPRING_CONFIG = {
  stiffness: 180,
  damping: 16,
};

const PASTEL = {
  light: {
    bg: '#FFFFFF',
    border: 'rgba(15,23,42,0.08)',
    text: 'hsl(220, 12%, 15%)',
    muted: 'hsl(220, 5%, 55%)',
    success: 'hsl(152, 60%, 42%)',
    successBg: 'hsl(152, 60%, 95%)',
    error: 'hsl(0, 72%, 55%)',
    errorBg: 'hsl(0, 72%, 96%)',
    warning: 'hsl(38, 92%, 50%)',
    warningBg: 'hsl(38, 92%, 95%)',
    info: 'hsl(220, 70%, 55%)',
    infoBg: 'hsl(220, 70%, 96%)',
  },
  dark: {
    bg: 'hsl(220, 10%, 14%)',
    border: 'rgba(255,255,255,0.1)',
    text: 'hsl(220, 5%, 93%)',
    muted: 'hsl(220, 5%, 55%)',
    success: 'hsl(152, 55%, 55%)',
    successBg: 'hsla(152, 55%, 55%, 0.12)',
    error: 'hsl(0, 65%, 60%)',
    errorBg: 'hsla(0, 65%, 60%, 0.12)',
    warning: 'hsl(38, 80%, 55%)',
    warningBg: 'hsla(38, 80%, 55%, 0.12)',
    info: 'hsl(220, 65%, 60%)',
    infoBg: 'hsla(220, 65%, 60%, 0.12)',
  },
};

export function Toast({
  id,
  title,
  description,
  variant = 'default',
  onDismiss,
  index,
  action,
}: ToastProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const p = isDark ? PASTEL.dark : PASTEL.light;

  const translateY = useSharedValue(-80);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    translateY.value = withSpring(0, SPRING_CONFIG);
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, SPRING_CONFIG);
  }, []);

  const getVariantColor = () => {
    switch (variant) {
      case 'success': return p.success;
      case 'error': return p.error;
      case 'warning': return p.warning;
      case 'info': return p.info;
      default: return p.muted;
    }
  };

  const getVariantBg = () => {
    switch (variant) {
      case 'success': return p.successBg;
      case 'error': return p.errorBg;
      case 'warning': return p.warningBg;
      case 'info': return p.infoBg;
      default: return p.bg;
    }
  };

  const getIcon = () => {
    const iconProps = { size: 18, color: getVariantColor() };
    switch (variant) {
      case 'success': return <Check {...iconProps} />;
      case 'error': return <X {...iconProps} />;
      case 'warning': return <AlertCircle {...iconProps} />;
      case 'info': return <Info {...iconProps} />;
      default: return null;
    }
  };

  const dismiss = useCallback(() => {
    const onDismissAction = () => {
      'worklet';
      runOnJS(onDismiss)(id);
    };
    translateY.value = withSpring(-80, SPRING_CONFIG);
    opacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) onDismissAction();
    });
    scale.value = withSpring(0.92, SPRING_CONFIG);
  }, [id, onDismiss]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (
        Math.abs(event.translationX) > screenWidth * 0.2 ||
        Math.abs(event.velocityX) > 600
      ) {
        const onDismissAction = () => {
          'worklet';
          runOnJS(onDismiss)(id);
        };
        translateX.value = withTiming(
          event.translationX > 0 ? screenWidth : -screenWidth,
          { duration: 200 }
        );
        opacity.value = withTiming(0, { duration: 200 }, (finished) => {
          if (finished) onDismissAction();
        });
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const getTopPosition = () => {
    const statusBarHeight = Platform.OS === 'ios' ? 59 : 24;
    return statusBarHeight + index * (TOAST_HEIGHT + TOAST_MARGIN);
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  const toastStyle: ViewStyle = {
    position: 'absolute',
    top: getTopPosition(),
    alignSelf: 'center',
    width: TOAST_WIDTH,
    zIndex: 1000 + index,
  };

  const icon = getIcon();

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[toastStyle, animatedContainerStyle]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: p.bg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: p.border,
            paddingHorizontal: 14,
            paddingVertical: 12,
            gap: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.35 : 0.08,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          {icon && (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: getVariantBg(),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </View>
          )}

          <View style={{ flex: 1, minWidth: 0 }}>
            {title ? (
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: 'Outfit-SemiBold',
                  fontSize: 14,
                  color: p.text,
                  letterSpacing: -0.1,
                }}
              >
                {title}
              </Text>
            ) : null}
            {description ? (
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: 'Outfit-Regular',
                  fontSize: 12,
                  color: p.muted,
                  marginTop: title ? 1 : 0,
                }}
              >
                {description}
              </Text>
            ) : null}
          </View>

          {action && (
            <TouchableOpacity
              onPress={action.onPress}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                backgroundColor: getVariantBg(),
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Outfit-SemiBold',
                  fontSize: 12,
                  color: getVariantColor(),
                }}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={dismiss}
            hitSlop={8}
            style={{ padding: 2 }}
          >
            <X size={14} color={p.muted} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

interface ToastContextType {
  toast: (toast: Omit<ToastData, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 3 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (toastData: Omit<ToastData, 'id'>) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: ToastData = {
        ...toastData,
        id,
        duration: toastData.duration ?? 2000,
      };

      setToasts((prev) => [newToast, ...prev].slice(0, maxToasts));

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, newToast.duration);
      }
    },
    [maxToasts]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const createVariantToast = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      addToast({ title, description, variant });
    },
    [addToast]
  );

  const contextValue: ToastContextType = {
    toast: addToast,
    success: (title, desc) => createVariantToast('success', title, desc),
    error: (title, desc) => createVariantToast('error', title, desc),
    warning: (title, desc) => createVariantToast('warning', title, desc),
    info: (title, desc) => createVariantToast('info', title, desc),
    dismiss: dismissToast,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          pointerEvents: 'box-none',
        }}
        pointerEvents='box-none'
      >
        {toasts.map((t, i) => (
          <Toast key={t.id} {...t} index={i} onDismiss={dismissToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
