import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

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
  ...rest
}: InputProps) {
  const [showPw, setShowPw] = useState(false);

  const borderColor = error ? Colors.danger : '#E2E8F0';
  const bgColor = error ? '#FEF2F2' : '#F8FAFC';

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={{ color: Colors.danger }}> *</Text>}
        </Text>
      )}

      <View style={[styles.inputBox, { borderColor, backgroundColor: bgColor }]}>
        <TextInput
          {...rest}
          value={value}
          placeholder={placeholder ?? label}
          placeholderTextColor="#94A3B8"
          style={styles.input}
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
              color="#94A3B8"
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={[styles.helperText, { color: Colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.helperText, { color: Colors.textSecondary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
});
