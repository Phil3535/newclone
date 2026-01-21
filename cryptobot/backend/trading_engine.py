import ccxt
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class TradingEngine:
    """Core trading engine for executing strategies"""
    
    def __init__(self, exchange_id: str, api_key: str, api_secret: str):
        self.exchange_id = exchange_id
        self.exchange = self._initialize_exchange(exchange_id, api_key, api_secret)
    
    def _initialize_exchange(self, exchange_id: str, api_key: str, api_secret: str):
        """Initialize exchange connection"""
        try:
            exchange_class = getattr(ccxt, exchange_id)
            exchange = exchange_class({
                'apiKey': api_key,
                'secret': api_secret,
                'enableRateLimit': True,
            })
            return exchange
        except Exception as e:
            logger.error(f"Failed to initialize exchange: {str(e)}")
            raise
    
    def get_balance(self) -> Dict:
        """Get account balance"""
        try:
            balance = self.exchange.fetch_balance()
            return balance
        except Exception as e:
            logger.error(f"Error fetching balance: {str(e)}")
            return {}
    
    def get_ticker(self, symbol: str) -> Dict:
        """Get current price for symbol"""
        try:
            ticker = self.exchange.fetch_ticker(symbol)
            return ticker
        except Exception as e:
            logger.error(f"Error fetching ticker: {str(e)}")
            return {}
    
    def place_order(self, symbol: str, order_type: str, side: str, amount: float, price: Optional[float] = None) -> Dict:
        """Place an order"""
        try:
            if order_type == 'market':
                order = self.exchange.create_order(symbol, 'market', side, amount)
            else:
                order = self.exchange.create_order(symbol, 'limit', side, amount, price)
            return order
        except Exception as e:
            logger.error(f"Error placing order: {str(e)}")
            return {}
    
    def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict]:
        """Get open orders"""
        try:
            orders = self.exchange.fetch_open_orders(symbol)
            return orders
        except Exception as e:
            logger.error(f"Error fetching open orders: {str(e)}")
            return []
    
    def cancel_order(self, order_id: str, symbol: str) -> bool:
        """Cancel an order"""
        try:
            self.exchange.cancel_order(order_id, symbol)
            return True
        except Exception as e:
            logger.error(f"Error canceling order: {str(e)}")
            return False

class GridStrategy:
    """Grid trading strategy"""
    
    def __init__(self, symbol: str, grid_levels: int, price_range: float, investment: float):
        self.symbol = symbol
        self.grid_levels = grid_levels
        self.price_range = price_range
        self.investment = investment
        self.grid_orders = []
    
    def calculate_grid(self, current_price: float) -> List[Dict]:
        """Calculate grid buy/sell levels"""
        lower_bound = current_price * (1 - self.price_range / 2)
        upper_bound = current_price * (1 + self.price_range / 2)
        price_step = (upper_bound - lower_bound) / self.grid_levels
        
        grid_levels = []
        for i in range(self.grid_levels + 1):
            price = lower_bound + (i * price_step)
            grid_levels.append({
                'price': round(price, 2),
                'side': 'buy' if price < current_price else 'sell',
                'amount': self.investment / (self.grid_levels * price)
            })
        
        return grid_levels
    
    def execute(self, engine: TradingEngine) -> Dict:
        """Execute grid strategy"""
        try:
            ticker = engine.get_ticker(self.symbol)
            current_price = ticker.get('last', 0)
            
            if not current_price:
                return {'status': 'error', 'message': 'Could not fetch current price'}
            
            grid_levels = self.calculate_grid(current_price)
            
            # Place grid orders
            placed_orders = []
            for level in grid_levels:
                if level['side'] == 'buy' and level['price'] < current_price:
                    order = engine.place_order(
                        self.symbol,
                        'limit',
                        'buy',
                        level['amount'],
                        level['price']
                    )
                    placed_orders.append(order)
            
            return {
                'status': 'success',
                'grid_levels': grid_levels,
                'orders_placed': len(placed_orders),
                'current_price': current_price
            }
        except Exception as e:
            logger.error(f"Grid strategy error: {str(e)}")
            return {'status': 'error', 'message': str(e)}

class DCAStrategy:
    """Dollar Cost Averaging strategy"""
    
    def __init__(self, symbol: str, amount_per_buy: float, interval_hours: int):
        self.symbol = symbol
        self.amount_per_buy = amount_per_buy
        self.interval_hours = interval_hours
        self.last_buy_time = None
    
    def should_buy(self) -> bool:
        """Check if it's time to buy"""
        if not self.last_buy_time:
            return True
        
        time_elapsed = datetime.utcnow() - self.last_buy_time
        return time_elapsed >= timedelta(hours=self.interval_hours)
    
    def execute(self, engine: TradingEngine) -> Dict:
        """Execute DCA strategy"""
        try:
            if not self.should_buy():
                return {'status': 'waiting', 'message': 'Not time to buy yet'}
            
            ticker = engine.get_ticker(self.symbol)
            current_price = ticker.get('last', 0)
            
            if not current_price:
                return {'status': 'error', 'message': 'Could not fetch price'}
            
            amount = self.amount_per_buy / current_price
            order = engine.place_order(self.symbol, 'market', 'buy', amount)
            
            if order:
                self.last_buy_time = datetime.utcnow()
                return {
                    'status': 'success',
                    'order': order,
                    'price': current_price,
                    'amount': amount
                }
            
            return {'status': 'error', 'message': 'Failed to place order'}
        except Exception as e:
            logger.error(f"DCA strategy error: {str(e)}")
            return {'status': 'error', 'message': str(e)}

class TrendFollowingStrategy:
    """Trend following strategy using moving averages"""
    
    def __init__(self, symbol: str, investment: float, fast_ma: int = 10, slow_ma: int = 30):
        self.symbol = symbol
        self.investment = investment
        self.fast_ma = fast_ma
        self.slow_ma = slow_ma
        self.position = None
    
    def calculate_signals(self, prices: List[float]) -> str:
        """Calculate buy/sell signals based on MA crossover"""
        if len(prices) < self.slow_ma:
            return 'hold'
        
        prices_series = pd.Series(prices)
        fast_ma_value = prices_series.rolling(window=self.fast_ma).mean().iloc[-1]
        slow_ma_value = prices_series.rolling(window=self.slow_ma).mean().iloc[-1]
        
        if fast_ma_value > slow_ma_value:
            return 'buy'
        elif fast_ma_value < slow_ma_value:
            return 'sell'
        return 'hold'
    
    def execute(self, engine: TradingEngine, historical_prices: List[float]) -> Dict:
        """Execute trend following strategy"""
        try:
            signal = self.calculate_signals(historical_prices)
            ticker = engine.get_ticker(self.symbol)
            current_price = ticker.get('last', 0)
            
            if not current_price:
                return {'status': 'error', 'message': 'Could not fetch price'}
            
            if signal == 'buy' and not self.position:
                amount = self.investment / current_price
                order = engine.place_order(self.symbol, 'market', 'buy', amount)
                if order:
                    self.position = 'long'
                    return {
                        'status': 'success',
                        'action': 'buy',
                        'order': order,
                        'price': current_price
                    }
            
            elif signal == 'sell' and self.position == 'long':
                balance = engine.get_balance()
                amount = balance.get('free', {}).get(self.symbol.split('/')[0], 0)
                if amount > 0:
                    order = engine.place_order(self.symbol, 'market', 'sell', amount)
                    if order:
                        self.position = None
                        return {
                            'status': 'success',
                            'action': 'sell',
                            'order': order,
                            'price': current_price
                        }
            
            return {'status': 'hold', 'signal': signal, 'position': self.position}
        except Exception as e:
            logger.error(f"Trend following error: {str(e)}")
            return {'status': 'error', 'message': str(e)}
