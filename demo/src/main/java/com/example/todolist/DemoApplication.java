package com.example.todolist;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {

	public static void main(String[] args) {
		SpringApplication.run(DemoApplication.class, args);
		
        byte b=1;
        byte c=(byte)(b<<7);
        b<<=7;
        int d=b<<1;
        System.out.println(c); 
        System.out.println(d); 
    }
}

	}

}
