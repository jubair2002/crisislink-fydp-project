import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  isPassword?: boolean;
  required?: boolean;
}

export function Input({
  label,
  error,
  hint,
  isPassword,
  required,
  placeholder,
  value,
  onFocus,
  onBlur,
  multiline,
  numberOfLines,
  style,
  ...rest
}: InputProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    container: { marginBottom: 16 },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      marginBottom: 6,
      marginLeft: 2,
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: c.textPrimary,
      padding: 0,
      margin: 0,
    },
    helperText: {
      fontSize: 12,
      marginTop: 6,
      marginLeft: 4,
    },
  }));

  const [showPw, setShowPw] = useState(false);

  const borderColor = error ? colors.danger : colors.inputBorder;
  const bgColor = error ? colors.inputErrorBg : colors.inputBg;

  const minHeight = multiline ? Math.max(80, (numberOfLines ?? 3) * 22) : 50;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={{ color: colors.danger }}> *</Text>}
        </Text>
      )}

      <View
        style={[
          styles.inputBox,
          {
            borderColor,
            backgroundColor: bgColor,
            minHeight,
            height: multiline ? undefined : minHeight,
            paddingVertical: multiline ? 10 : 0,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        <TextInput
          {...rest}
          multiline={multiline}
          numberOfLines={numberOfLines}
          value={value}
          placeholder={placeholder ?? label}
          placeholderTextColor={colors.chevron}
          style={[styles.input, multiline && { textAlignVertical: 'top' }, style]}
          secureTextEntry={isPassword && !showPw}
          onFocus={(e) => {
            onFocus?.(e);
          }}
          onBlur={(e) => {
            onBlur?.(e);
          }}
        />

        {isPassword && (
          <TouchableOpacity onPress={() => setShowPw(!showPw)} hitSlop={10}>
            <Ionicons
              name={showPw ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.chevron}
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={[styles.helperText, { color: colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}
