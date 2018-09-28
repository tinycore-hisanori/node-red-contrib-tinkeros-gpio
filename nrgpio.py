import ASUS.GPIO as GPIO
import struct
import sys
import os
import subprocess
from time import sleep

try:
    raw_input          # Python 2
except NameError:
    raw_input = input  # Python 3

bounce = 25


if len(sys.argv) > 2:
    cmd = sys.argv[1].lower()
    pin = int(sys.argv[2])
    GPIO.setmode(GPIO.BOARD)
    GPIO.setwarnings(False)

    if cmd == "out":
        GPIO.setup(pin,GPIO.OUT)
        if len(sys.argv) == 4:
            GPIO.output(pin,int(sys.argv[3]))

        while True:
            try:
                data = raw_input()
                if 'close' in data:
                    sys.exit(0)
                data = int(data)
            except (EOFError, SystemExit):        # hopefully always caused by us sigint'ing the program
                GPIO.cleanup(pin)
                sys.exit(0)
            except:
                if len(sys.argv) == 4:
                   data = int(sys.argv[3])
                else:
                   data = 0
            if data != 0:
                data = 1
            GPIO.output(pin,data)


    elif cmd == "in":
        #print("Initialised pin "+str(pin)+" to IN")
        bounce = float(sys.argv[4])
        def handle_callback(chan):
            sleep(bounce/1000.0)
            print(GPIO.input(chan))

        if sys.argv[3].lower() == "up":
            GPIO.setup(pin,GPIO.IN,GPIO.PUD_UP)
        elif sys.argv[3].lower() == "down":
            GPIO.setup(pin,GPIO.IN,GPIO.PUD_DOWN)
        else:
            GPIO.setup(pin,GPIO.IN)

        GPIO.add_event_detect(pin, GPIO.BOTH, callback=handle_callback, bouncetime=int(bounce))

        while True:
            try:
                data = raw_input()
                if 'close' in data:
                    sys.exit(0)
            except (EOFError, SystemExit):        # hopefully always caused by us sigint'ing the program
                GPIO.cleanup(pin)
                sys.exit(0)

else:
    print("Bad paramaters")

