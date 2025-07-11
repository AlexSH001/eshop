module.exports = {

"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}}),
"[project]/src/contexts/CartContext.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "CartProvider": (()=>CartProvider),
    "useCart": (()=>useCart)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
const cartReducer = (state, action)=>{
    switch(action.type){
        case 'ADD_ITEM':
            {
                const existingItem = state.items.find((item)=>item.id === action.payload.id);
                if (existingItem) {
                    const updatedItems = state.items.map((item)=>item.id === action.payload.id ? {
                            ...item,
                            quantity: item.quantity + 1
                        } : item);
                    const total = updatedItems.reduce((sum, item)=>sum + item.price * item.quantity, 0);
                    const itemCount = updatedItems.reduce((sum, item)=>sum + item.quantity, 0);
                    return {
                        items: updatedItems,
                        total,
                        itemCount
                    };
                }
                const newItem = {
                    ...action.payload,
                    quantity: 1
                };
                const updatedItems = [
                    ...state.items,
                    newItem
                ];
                const total = updatedItems.reduce((sum, item)=>sum + item.price * item.quantity, 0);
                const itemCount = updatedItems.reduce((sum, item)=>sum + item.quantity, 0);
                return {
                    items: updatedItems,
                    total,
                    itemCount
                };
            }
        case 'REMOVE_ITEM':
            {
                const updatedItems = state.items.filter((item)=>item.id !== action.payload);
                const total = updatedItems.reduce((sum, item)=>sum + item.price * item.quantity, 0);
                const itemCount = updatedItems.reduce((sum, item)=>sum + item.quantity, 0);
                return {
                    items: updatedItems,
                    total,
                    itemCount
                };
            }
        case 'UPDATE_QUANTITY':
            {
                if (action.payload.quantity <= 0) {
                    const updatedItems = state.items.filter((item)=>item.id !== action.payload.id);
                    const total = updatedItems.reduce((sum, item)=>sum + item.price * item.quantity, 0);
                    const itemCount = updatedItems.reduce((sum, item)=>sum + item.quantity, 0);
                    return {
                        items: updatedItems,
                        total,
                        itemCount
                    };
                }
                const updatedItems = state.items.map((item)=>item.id === action.payload.id ? {
                        ...item,
                        quantity: action.payload.quantity
                    } : item);
                const total = updatedItems.reduce((sum, item)=>sum + item.price * item.quantity, 0);
                const itemCount = updatedItems.reduce((sum, item)=>sum + item.quantity, 0);
                return {
                    items: updatedItems,
                    total,
                    itemCount
                };
            }
        case 'CLEAR_CART':
            return {
                items: [],
                total: 0,
                itemCount: 0
            };
        case 'SET_CART':
            const total = action.payload.reduce((sum, item)=>sum + item.price * item.quantity, 0);
            const itemCount = action.payload.reduce((sum, item)=>sum + item.quantity, 0);
            return {
                items: action.payload,
                total,
                itemCount
            };
        default:
            return state;
    }
};
const CartContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const CartProvider = ({ children })=>{
    const [state, dispatch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useReducer"])(cartReducer, {
        items: [],
        total: 0,
        itemCount: 0
    });
    // Load cart from API on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const loadCart = async ()=>{
            try {
                const sessionId = localStorage.getItem('session_id');
                const token = localStorage.getItem('auth_token');
                if (!sessionId && !token) {
                    // Create session ID for guest users
                    const newSessionId = Math.random().toString(36).substr(2, 9);
                    localStorage.setItem('session_id', newSessionId);
                }
                const response = await fetch(`${("TURBOPACK compile-time value", "http://localhost:3001/api") || 'http://localhost:3001/api'}/cart`, {
                    headers: {
                        ...token && {
                            Authorization: `Bearer ${token}`
                        },
                        ...sessionId && {
                            'X-Session-ID': sessionId
                        }
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    // Convert API cart items to local format
                    const items = data.items?.map((item)=>({
                            id: item.product_id,
                            name: item.product_name,
                            price: parseFloat(item.price),
                            image: item.product_image,
                            category: item.category_name || 'Unknown',
                            quantity: item.quantity
                        })) || [];
                    dispatch({
                        type: 'SET_CART',
                        payload: items
                    });
                }
            } catch (error) {
                console.error('Failed to load cart:', error);
            }
        };
        loadCart();
    }, []);
    const addItem = async (item)=>{
        try {
            const sessionId = localStorage.getItem('session_id');
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${("TURBOPACK compile-time value", "http://localhost:3001/api") || 'http://localhost:3001/api'}/cart/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...token && {
                        Authorization: `Bearer ${token}`
                    },
                    ...sessionId && {
                        'X-Session-ID': sessionId
                    }
                },
                body: JSON.stringify({
                    productId: item.id,
                    quantity: 1
                })
            });
            if (response.ok) {
                dispatch({
                    type: 'ADD_ITEM',
                    payload: item
                });
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success(`${item.name} added to cart!`);
            } else {
                const error = await response.json();
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error.error || 'Failed to add item to cart');
            }
        } catch (error) {
            console.error('Failed to add item to cart:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to add item to cart');
        }
    };
    const removeItem = async (id)=>{
        try {
            const sessionId = localStorage.getItem('session_id');
            const token = localStorage.getItem('auth_token');
            const item = state.items.find((item)=>item.id === id);
            const response = await fetch(`${("TURBOPACK compile-time value", "http://localhost:3001/api") || 'http://localhost:3001/api'}/cart/items/${id}`, {
                method: 'DELETE',
                headers: {
                    ...token && {
                        Authorization: `Bearer ${token}`
                    },
                    ...sessionId && {
                        'X-Session-ID': sessionId
                    }
                }
            });
            if (response.ok) {
                dispatch({
                    type: 'REMOVE_ITEM',
                    payload: id
                });
                if (item) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success(`${item.name} removed from cart`);
                }
            } else {
                const error = await response.json();
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error.error || 'Failed to remove item from cart');
            }
        } catch (error) {
            console.error('Failed to remove item from cart:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to remove item from cart');
        }
    };
    const updateQuantity = async (id, quantity)=>{
        try {
            const sessionId = localStorage.getItem('session_id');
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${("TURBOPACK compile-time value", "http://localhost:3001/api") || 'http://localhost:3001/api'}/cart/items/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...token && {
                        Authorization: `Bearer ${token}`
                    },
                    ...sessionId && {
                        'X-Session-ID': sessionId
                    }
                },
                body: JSON.stringify({
                    quantity
                })
            });
            if (response.ok) {
                dispatch({
                    type: 'UPDATE_QUANTITY',
                    payload: {
                        id,
                        quantity
                    }
                });
            } else {
                const error = await response.json();
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error.error || 'Failed to update quantity');
            }
        } catch (error) {
            console.error('Failed to update quantity:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to update quantity');
        }
    };
    const clearCart = async ()=>{
        try {
            const sessionId = localStorage.getItem('session_id');
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${("TURBOPACK compile-time value", "http://localhost:3001/api") || 'http://localhost:3001/api'}/cart`, {
                method: 'DELETE',
                headers: {
                    ...token && {
                        Authorization: `Bearer ${token}`
                    },
                    ...sessionId && {
                        'X-Session-ID': sessionId
                    }
                }
            });
            if (response.ok) {
                dispatch({
                    type: 'CLEAR_CART'
                });
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Cart cleared');
            } else {
                const error = await response.json();
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(error.error || 'Failed to clear cart');
            }
        } catch (error) {
            console.error('Failed to clear cart:', error);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to clear cart');
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])(CartContext.Provider, {
        value: {
            state,
            addItem,
            removeItem,
            updateQuantity,
            clearCart
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/contexts/CartContext.tsx",
        lineNumber: 268,
        columnNumber: 5
    }, this);
};
const useCart = ()=>{
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
}}),
"[project]/src/contexts/AuthContext.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "AuthProvider": (()=>AuthProvider),
    "useAuth": (()=>useAuth)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function AuthProvider({ children }) {
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        user: null,
        isAuthenticated: false,
        isLoading: true
    });
    // Check for existing session on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const checkAuth = async ()=>{
            const token = localStorage.getItem('auth_token');
            const storedUser = localStorage.getItem('user');
            if (token && storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    setState({
                        user,
                        isAuthenticated: true,
                        isLoading: false
                    });
                } catch (error) {
                    console.error('Failed to parse stored user:', error);
                    localStorage.removeItem('user');
                    localStorage.removeItem('auth_token');
                    setState((prev)=>({
                            ...prev,
                            isLoading: false
                        }));
                }
            } else {
                setState((prev)=>({
                        ...prev,
                        isLoading: false
                    }));
            }
        };
        checkAuth();
    }, []);
    const login = async (email, password)=>{
        try {
            const response = await fetch(`${("TURBOPACK compile-time value", "http://localhost:3001/api") || 'http://localhost:3001/api'}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });
            const data = await response.json();
            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Login failed'
                };
            }
            // Store tokens
            localStorage.setItem('auth_token', data.accessToken);
            if (data.refreshToken) {
                localStorage.setItem('refresh_token', data.refreshToken);
            }
            // Store user data
            const user = {
                id: data.user.id.toString(),
                email: data.user.email,
                name: `${data.user.first_name} ${data.user.last_name}`,
                firstName: data.user.first_name,
                lastName: data.user.last_name
            };
            localStorage.setItem('user', JSON.stringify(user));
            setState({
                user,
                isAuthenticated: true,
                isLoading: false
            });
            return {
                success: true
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: 'Login failed. Please try again.'
            };
        }
    };
    const signup = async (email, password, firstName, lastName)=>{
        try {
            const response = await fetch(`${("TURBOPACK compile-time value", "http://localhost:3001/api") || 'http://localhost:3001/api'}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    firstName,
                    lastName
                })
            });
            const data = await response.json();
            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Signup failed'
                };
            }
            // Store tokens
            localStorage.setItem('auth_token', data.accessToken);
            if (data.refreshToken) {
                localStorage.setItem('refresh_token', data.refreshToken);
            }
            // Store user data
            const user = {
                id: data.user.id.toString(),
                email: data.user.email,
                name: `${data.user.first_name} ${data.user.last_name}`,
                firstName: data.user.first_name,
                lastName: data.user.last_name
            };
            localStorage.setItem('user', JSON.stringify(user));
            setState({
                user,
                isAuthenticated: true,
                isLoading: false
            });
            return {
                success: true
            };
        } catch (error) {
            console.error('Signup error:', error);
            return {
                success: false,
                error: 'Signup failed. Please try again.'
            };
        }
    };
    const logout = ()=>{
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('wishlist');
        setState({
            user: null,
            isAuthenticated: false,
            isLoading: false
        });
    };
    const value = {
        ...state,
        login,
        signup,
        logout
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])(AuthContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/contexts/AuthContext.tsx",
        lineNumber: 172,
        columnNumber: 5
    }, this);
}
function useAuth() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
}}),
"[project]/src/contexts/WishlistContext.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "WishlistProvider": (()=>WishlistProvider),
    "useWishlist": (()=>useWishlist)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
const WishlistContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function WishlistProvider({ children }) {
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        items: [],
        itemCount: 0
    });
    // Load wishlist from localStorage on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const savedWishlist = localStorage.getItem('wishlist');
        if (savedWishlist) {
            try {
                const items = JSON.parse(savedWishlist);
                setState({
                    items,
                    itemCount: items.length
                });
            } catch (error) {
                console.error('Failed to parse wishlist:', error);
                localStorage.removeItem('wishlist');
            }
        }
    }, []);
    // Save to localStorage whenever wishlist changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        localStorage.setItem('wishlist', JSON.stringify(state.items));
    }, [
        state.items
    ]);
    const addToWishlist = (item)=>{
        setState((prev)=>{
            const existingItem = prev.items.find((i)=>i.id === item.id);
            if (existingItem) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].info('Item already in wishlist');
                return prev;
            }
            const newItems = [
                ...prev.items,
                item
            ];
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Added to wishlist');
            return {
                items: newItems,
                itemCount: newItems.length
            };
        });
    };
    const removeFromWishlist = (id)=>{
        setState((prev)=>{
            const newItems = prev.items.filter((item)=>item.id !== id);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Removed from wishlist');
            return {
                items: newItems,
                itemCount: newItems.length
            };
        });
    };
    const toggleWishlist = (item)=>{
        setState((prev)=>{
            const existingItem = prev.items.find((i)=>i.id === item.id);
            if (existingItem) {
                // Remove from wishlist
                const newItems = prev.items.filter((i)=>i.id !== item.id);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Removed from wishlist');
                return {
                    items: newItems,
                    itemCount: newItems.length
                };
            }
            // Add to wishlist
            const newItems = [
                ...prev.items,
                item
            ];
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Added to wishlist');
            return {
                items: newItems,
                itemCount: newItems.length
            };
        });
    };
    const isInWishlist = (id)=>{
        return state.items.some((item)=>item.id === id);
    };
    const clearWishlist = ()=>{
        setState({
            items: [],
            itemCount: 0
        });
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Wishlist cleared');
    };
    const value = {
        state,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        clearWishlist
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])(WishlistContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/contexts/WishlistContext.tsx",
        lineNumber: 132,
        columnNumber: 5
    }, this);
}
function useWishlist() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
}
}}),
"[project]/src/contexts/SearchContext.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "SearchProvider": (()=>SearchProvider),
    "useSearch": (()=>useSearch)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
const SearchContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function SearchProvider({ children }) {
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        query: '',
        results: [],
        isSearching: false,
        recentSearches: ("TURBOPACK compile-time falsy", 0) ? ("TURBOPACK unreachable", undefined) : []
    });
    const search = async (query)=>{
        setState((prev)=>({
                ...prev,
                query,
                isSearching: true
            }));
        if (!query.trim()) {
            setState((prev)=>({
                    ...prev,
                    results: [],
                    isSearching: false
                }));
            return;
        }
        try {
            const res = await fetch(`http://localhost:3001/api/products?search=${encodeURIComponent(query)}&limit=6`);
            if (!res.ok) throw new Error('Failed to fetch products');
            const data = await res.json();
            setState((prev)=>({
                    ...prev,
                    results: data.products,
                    isSearching: false
                }));
        } catch (err) {
            setState((prev)=>({
                    ...prev,
                    results: [],
                    isSearching: false
                }));
        }
    };
    const clearSearch = ()=>{
        setState((prev)=>({
                ...prev,
                query: '',
                results: [],
                isSearching: false
            }));
    };
    const addRecentSearch = (query)=>{
        if (!query.trim()) return;
        setState((prev)=>{
            const newRecentSearches = [
                query,
                ...prev.recentSearches.filter((s)=>s !== query)
            ].slice(0, 5);
            if ("TURBOPACK compile-time falsy", 0) {
                "TURBOPACK unreachable";
            }
            return {
                ...prev,
                recentSearches: newRecentSearches
            };
        });
    };
    const clearRecentSearches = ()=>{
        setState((prev)=>({
                ...prev,
                recentSearches: []
            }));
        if ("TURBOPACK compile-time falsy", 0) {
            "TURBOPACK unreachable";
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])(SearchContext.Provider, {
        value: {
            state,
            search,
            clearSearch,
            addRecentSearch,
            clearRecentSearches
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/contexts/SearchContext.tsx",
        lineNumber: 89,
        columnNumber: 5
    }, this);
}
function useSearch() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(SearchContext);
    if (context === undefined) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
}
}}),
"[project]/src/contexts/AdminContext.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "AdminProvider": (()=>AdminProvider),
    "useAdmin": (()=>useAdmin)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
const AdminContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function AdminProvider({ children }) {
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        user: null,
        isAuthenticated: false,
        isLoading: true
    });
    // Check for existing admin session on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const checkAdminAuth = ()=>{
            const storedAdmin = localStorage.getItem('admin_user');
            if (storedAdmin) {
                try {
                    const user = JSON.parse(storedAdmin);
                    setState({
                        user,
                        isAuthenticated: true,
                        isLoading: false
                    });
                } catch (error) {
                    console.error('Failed to parse stored admin user:', error);
                    localStorage.removeItem('admin_user');
                    setState((prev)=>({
                            ...prev,
                            isLoading: false
                        }));
                }
            } else {
                setState((prev)=>({
                        ...prev,
                        isLoading: false
                    }));
            }
        };
        checkAdminAuth();
    }, []);
    const login = async (email, password)=>{
        try {
            const res = await fetch('http://localhost:3001/api/auth/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });
            if (!res.ok) {
                const data = await res.json();
                return {
                    success: false,
                    error: data.error || 'Invalid admin credentials'
                };
            }
            const data = await res.json();
            const user = {
                id: data.admin.id,
                email: data.admin.email,
                name: data.admin.name,
                role: data.admin.role
            };
            localStorage.setItem('admin_user', JSON.stringify(user));
            localStorage.setItem('admin_token', data.token);
            setState({
                user,
                isAuthenticated: true,
                isLoading: false
            });
            return {
                success: true
            };
        } catch (error) {
            return {
                success: false,
                error: 'Login failed. Please try again.'
            };
        }
    };
    const logout = ()=>{
        localStorage.removeItem('admin_user');
        setState({
            user: null,
            isAuthenticated: false,
            isLoading: false
        });
    };
    const value = {
        ...state,
        login,
        logout
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])(AdminContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/contexts/AdminContext.tsx",
        lineNumber: 104,
        columnNumber: 5
    }, this);
}
function useAdmin() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
}
}}),
"[project]/src/components/ui/sonner.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "Toaster": (()=>Toaster)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-themes/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
const Toaster = ({ ...props })=>{
    const { theme = "system" } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTheme"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Toaster"], {
        theme: theme,
        className: "toaster group",
        toastOptions: {
            classNames: {
                toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                description: "group-[.toast]:text-muted-foreground",
                actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
            }
        },
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/sonner.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, this);
};
;
}}),
"[project]/src/app/ClientBody.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>ClientBody)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/same-runtime/dist/jsx-dev-runtime.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$CartContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/CartContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/AuthContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$WishlistContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/WishlistContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$SearchContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/SearchContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$AdminContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/AdminContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sonner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/sonner.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
function ClientBody({ children }) {
    // Remove any extension-added classes during hydration
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        // This runs only on the client after hydration
        document.body.className = "antialiased";
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuthProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$AdminContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AdminProvider"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$WishlistContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WishlistProvider"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$SearchContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SearchProvider"], {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$CartContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CartProvider"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])("div", {
                            className: "antialiased",
                            children: [
                                children,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$same$2d$runtime$2f$dist$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sonner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Toaster"], {
                                    richColors: true,
                                    position: "top-right"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/ClientBody.tsx",
                                    lineNumber: 30,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/ClientBody.tsx",
                            lineNumber: 28,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/ClientBody.tsx",
                        lineNumber: 27,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/ClientBody.tsx",
                    lineNumber: 26,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/ClientBody.tsx",
                lineNumber: 25,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/ClientBody.tsx",
            lineNumber: 24,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/ClientBody.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, this);
}
}}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}}),

};

//# sourceMappingURL=%5Broot-of-the-server%5D__e6401196._.js.map