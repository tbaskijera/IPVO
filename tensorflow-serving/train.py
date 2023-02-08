import argparse, os
import boto3
import sagemaker
import pandas as pd
import numpy as np
from sklearn import datasets
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense
from tensorflow.keras.callbacks import EarlyStopping


#ANN Model
def createModel():
    model = Sequential()
    model.add(Dense(13, input_shape=(13,), activation='relu'))
    model.add(Dense(28, activation='relu'))
    model.add(Dense(13, activation='relu'))
    model.add(Dense(8, activation='relu'))
    model.add(Dense(1))
    model.compile(optimizer='adam', loss='mse')
    return model

#Load data
boston = datasets.load_boston()
df = pd.DataFrame(boston.data, columns = boston.feature_names)
df['MEDV'] = boston.target 

#Split Model
X = df.drop(['MEDV'], axis = 1) 
y = df['MEDV']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size = .2, random_state = 42)

#minimum epochs 15
model = createModel()
monitor_val_acc = EarlyStopping(monitor = 'val_loss', patience=15)
model.fit(X_train, y_train, validation_data=(X_test, y_test), callbacks=[monitor_val_acc], epochs=5)
model.save('boston_model/0000001')