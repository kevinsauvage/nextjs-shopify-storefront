export const userFeedback = {
  activateAccount: {
    error: 'Unable to activate account. Please try again.',
    success: 'Account activated successfully. You are now signed in.',
  },
  addLinesToCart: {
    error: 'Unable to add item to cart. Please try again.',
    success: 'Item added to cart',
  },
  login: {
    error: 'Unable to sign in. Please check your credentials and try again.',
    success: 'Signed in successfully',
  },
  logout: {
    error: 'Unable to sign out. Please try again.',
    success: 'Signed out successfully',
  },
  missingFields: 'Please fill in all required fields',
  newsletter: {
    error: 'Unable to subscribe. Please try again.',
    success: 'Thanks — you are on the list.',
  },
  passwordDifferent: 'Passwords do not match',
  passwordLength: 'Password must be at least 8 characters',
  register: {
    error: 'Unable to create account. Please try again.',
    success: 'Account created successfully',
  },
  removeLinesFromCart: {
    error: 'Unable to remove item from cart. Please try again.',
    success: 'Item removed from cart',
  },
  resetPassword: {
    error: 'Unable to reset password. Please try again.',
    success: 'Password reset successfully. You are now signed in.',
  },
  sendRecoverEmail: {
    success: 'Password reset link sent to your email',
  },
  updateLines: {
    error: 'Unable to update item in cart. Please try again.',
    success: 'Cart updated',
  },
} as const;
